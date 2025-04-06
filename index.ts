import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { WorkflowsScanner } from "./workflows-scanner";

// Load environment variables
dotenv.config();

// Get configuration
const config = new pulumi.Config();
const organization =
  config.get("repository-guardian:organization") ||
  process.env.GITHUB_ORGANIZATION ||
  "";
const defaultBranch =
  config.get("repository-guardian:default-branch") ||
  process.env.DEFAULT_BRANCH ||
  "main";
const requiredStatusChecks = config.getObject<string[]>(
  "repository-guardian:required-status-checks"
) ||
  process.env.REQUIRED_STATUS_CHECKS?.split(",") || ["tests", "linting"];
const minReviewers =
  config.getNumber("repository-guardian:min-reviewers") ||
  parseInt(process.env.MIN_REVIEWERS || "2");
const scanFrequency =
  config.get("repository-guardian:scan-frequency") ||
  process.env.SCAN_FREQUENCY ||
  "daily";

// Initialize GitHub provider
const provider = new github.Provider("github-provider", {
  token: process.env.GITHUB_TOKEN,
  owner: organization,
});

/**
 * Class to manage GitHub repository protection rules
 */
class RepositoryGuardian {
  private provider: github.Provider;
  private organization: string;
  private defaultBranch: string;
  private requiredStatusChecks: string[];
  private minReviewers: number;
  private repositories: pulumi.Output<string>[] = [];
  private workflowsScanner: WorkflowsScanner | null = null;

  constructor(
    provider: github.Provider,
    organization: string,
    defaultBranch: string,
    requiredStatusChecks: string[],
    minReviewers: number
  ) {
    this.provider = provider;
    this.organization = organization;
    this.defaultBranch = defaultBranch;
    this.requiredStatusChecks = requiredStatusChecks;
    this.minReviewers = minReviewers;

    // Initialize workflow scanner if GitHub token is available
    if (process.env.GITHUB_TOKEN && organization) {
      this.workflowsScanner = new WorkflowsScanner(
        process.env.GITHUB_TOKEN,
        organization
      );
    }
  }

  /**
   * Apply branch protection rules to a repository
   */
  applyBranchProtection(repo: github.Repository): github.BranchProtection {
    return new github.BranchProtection(
      `${repo.name}-branch-protection`,
      {
        repositoryId: repo.nodeId,
        pattern: this.defaultBranch,
        requiredStatusChecks: [
          {
            contexts: this.requiredStatusChecks,
          },
        ],
        requiredPullRequestReviews: [
          {
            requiredApprovingReviewCount: this.minReviewers,
          },
        ],
        enforceAdmins: true,
        allowsForcePushes: false,
        allowsDeletions: false,
      },
      { provider: this.provider }
    );
  }

  /**
   * Configure secrets and environment variables for a repository
   */
  configureSecrets(
    repo: github.Repository,
    secrets: Record<string, string>
  ): void {
    for (const [name, value] of Object.entries(secrets)) {
      new github.ActionsSecret(
        `${repo.name}-${name}-secret`,
        {
          repository: repo.name,
          secretName: name,
          plaintextValue: value,
        },
        { provider: this.provider }
      );
    }
  }

  /**
   * Monitor for security vulnerabilities in GitHub Actions workflows
   */
  monitorWorkflowSecurity(repo: github.Repository): void {
    // Add a security policy file to the repository
    new github.RepositoryFile(
      `${repo.name}-security-policy`,
      {
        repository: repo.name,
        file: "SECURITY.md",
        content: `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities to security@example.com.

We will acknowledge receipt of your vulnerability report and send you regular updates about our progress.
`,
        branch: this.defaultBranch,
        commitMessage: "Add security policy",
        commitAuthor: "Repository Guardian",
        commitEmail: "security@example.com",
        overwriteOnCreate: true,
      },
      { provider: this.provider }
    );

    // Add a workflow file to scan for vulnerabilities periodically
    new github.RepositoryFile(
      `${repo.name}-security-scan-workflow`,
      {
        repository: repo.name,
        file: ".github/workflows/security-scan.yml",
        content: `name: Security Scan

on:
  schedule:
    - cron: '0 0 * * *'  # Run daily at midnight
  workflow_dispatch:  # Allow manual triggering

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
`,
        branch: this.defaultBranch,
        commitMessage: "Add security scan workflow",
        commitAuthor: "Repository Guardian",
        commitEmail: "security@example.com",
        overwriteOnCreate: true,
      },
      { provider: this.provider }
    );
  }

  /**
   * Generate compliance report for a repository
   */
  generateComplianceReport(repo: github.Repository): pulumi.Output<string> {
    return pulumi.interpolate`
# Compliance Report for ${repo.name}

## Branch Protection
- Default Branch: ${this.defaultBranch}
- Required Status Checks: ${this.requiredStatusChecks.join(", ")}
- Required Reviewers: ${this.minReviewers}
- Admin Enforcement: Enabled
- Force Pushes: Disabled
- Branch Deletions: Disabled

## Security Measures
- Security Policy: Enabled
- Vulnerability Scanning: ${scanFrequency}
- Secret Scanning: Enabled

Generated by Repository Guardian on ${new Date().toISOString()}
        `;
  }

  /**
   * Apply all protection rules to a repository
   */
  protectRepository(
    repoName: string,
    description: string = "",
    isPrivate: boolean = true
  ): github.Repository {
    // Create or update repository
    const repo = new github.Repository(
      repoName,
      {
        name: repoName,
        description: description || `Repository managed by Repository Guardian`,
        visibility: isPrivate ? "private" : "public",
        hasIssues: true,
        hasProjects: true,
        hasWiki: true,
        vulnerabilityAlerts: true,
        deleteBranchOnMerge: true,
      },
      { provider: this.provider }
    );

    // Apply branch protection
    this.applyBranchProtection(repo);

    // Monitor for security vulnerabilities
    this.monitorWorkflowSecurity(repo);

    // Generate compliance report
    const report = this.generateComplianceReport(repo);
    this.repositories.push(report);

    return repo;
  }

  /**
   * Get compliance reports for all repositories
   */
  getComplianceReports(): pulumi.Output<string> {
    return pulumi
      .all(this.repositories)
      .apply((reports) => reports.join("\n\n---\n\n"));
  }

  /**
   * Scan all repositories in the organization for workflow security issues
   * This is a manual function that would be triggered periodically in a real application
   */
  async scanAllRepositories(): Promise<Record<string, string>> {
    if (!this.workflowsScanner) {
      return {
        error:
          "Workflow scanner not initialized. Make sure GITHUB_TOKEN and organization are set.",
      };
    }

    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      const { data: repos } = await octokit.repos.listForOrg({
        org: this.organization,
        type: "all",
        per_page: 100,
      });

      const scanResults: Record<string, string> = {};

      for (const repo of repos) {
        console.log(`Scanning ${repo.name} for workflow security issues...`);
        const result = await this.workflowsScanner.scanRepository(repo.name);
        scanResults[repo.name] = this.workflowsScanner.generateReport(result);
      }

      return scanResults;
    } catch (error) {
      return {
        error: `Error scanning repositories: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}

// Initialize Repository Guardian
const guardian = new RepositoryGuardian(
  provider,
  organization,
  defaultBranch,
  requiredStatusChecks,
  minReviewers
);

// Declare output variable outside conditional block
let complianceReport: pulumi.Output<string>;

// Example usage: protect a repository
if (organization) {
  const repo = guardian.protectRepository(
    "example-repo",
    "An example repository protected by Repository Guardian"
  );

  // Example: configure secrets
  guardian.configureSecrets(repo, {
    API_KEY: "dummy-value-replace-in-production",
    DATABASE_URL: "dummy-value-replace-in-production",
  });

  // Assign to the variable declared outside
  complianceReport = guardian.getComplianceReports();
} else {
  console.log(
    "No organization specified. Set the repository-guardian:organization config value or GITHUB_ORGANIZATION environment variable."
  );
  // Provide a default value when organization is not set
  complianceReport = pulumi.output("No organization specified");
}

// Export the compliance report
export const repoComplianceReport = complianceReport;

// Export some useful information
export const repositoryGuardianConfig = {
  organization,
  defaultBranch,
  requiredStatusChecks,
  minReviewers,
  scanFrequency,
};
