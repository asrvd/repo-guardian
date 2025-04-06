#!/usr/bin/env node

import * as pulumi from "@pulumi/pulumi";
import * as dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import { WorkflowsScanner } from "./workflows-scanner";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Make sure we have a GitHub token
if (!process.env.GITHUB_TOKEN) {
  console.error(
    "Error: GITHUB_TOKEN is not set. Please set it in your .env file."
  );
  process.exit(1);
}

// Make sure we have an organization
if (!process.env.GITHUB_ORGANIZATION) {
  console.error(
    "Error: GITHUB_ORGANIZATION is not set. Please set it in your .env file."
  );
  process.exit(1);
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const organization = process.env.GITHUB_ORGANIZATION;

/**
 * Display menu options
 */
function displayMenu(): void {
  console.log("\n=== Repository Guardian CLI ===");
  console.log("1. List repositories in organization");
  console.log("2. Scan repository for workflow security issues");
  console.log("3. Scan all repositories for workflow security issues");
  console.log("4. Generate compliance report");
  console.log("5. Exit");
  console.log("==============================\n");
}

/**
 * List all repositories in the organization
 */
async function listRepositories(): Promise<void> {
  try {
    const { data: repos } = await octokit.repos.listForOrg({
      org: organization,
      type: "all",
      per_page: 100,
    });

    console.log(`\nRepositories in organization ${organization}:`);

    repos.forEach((repo, index) => {
      console.log(
        `${index + 1}. ${repo.name} (${repo.private ? "Private" : "Public"})`
      );
    });

    console.log(`\nTotal: ${repos.length} repositories`);
  } catch (error) {
    console.error(
      `Error listing repositories: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Scan a repository for workflow security issues
 */
async function scanRepository(): Promise<void> {
  rl.question("Enter repository name: ", async (repoName) => {
    if (!repoName.trim()) {
      console.error("Error: Repository name is required.");
      return mainMenu();
    }

    try {
      console.log(`Scanning ${repoName} for workflow security issues...`);

      const scanner = new WorkflowsScanner(
        process.env.GITHUB_TOKEN!,
        organization
      );
      const result = await scanner.scanRepository(repoName.trim());
      const report = scanner.generateReport(result);

      console.log("\nScan complete!");

      // Save report to file
      const outputDir = path.join(process.cwd(), "reports");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      const filename = path.join(
        outputDir,
        `${repoName}-workflow-scan-${new Date().toISOString().slice(0, 10)}.md`
      );
      fs.writeFileSync(filename, report);

      console.log(`Report saved to ${filename}`);
    } catch (error) {
      console.error(
        `Error scanning repository: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    mainMenu();
  });
}

/**
 * Scan all repositories for workflow security issues
 */
async function scanAllRepositories(): Promise<void> {
  try {
    console.log(
      `Scanning all repositories in organization ${organization} for workflow security issues...`
    );

    const { data: repos } = await octokit.repos.listForOrg({
      org: organization,
      type: "all",
      per_page: 100,
    });

    const scanner = new WorkflowsScanner(
      process.env.GITHUB_TOKEN!,
      organization
    );
    const outputDir = path.join(process.cwd(), "reports");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    for (const repo of repos) {
      console.log(`Scanning ${repo.name}...`);
      const result = await scanner.scanRepository(repo.name);
      const report = scanner.generateReport(result);

      const filename = path.join(
        outputDir,
        `${repo.name}-workflow-scan-${new Date().toISOString().slice(0, 10)}.md`
      );
      fs.writeFileSync(filename, report);

      console.log(`Report for ${repo.name} saved to ${filename}`);
    }

    console.log("\nAll repositories scanned successfully!");
  } catch (error) {
    console.error(
      `Error scanning repositories: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  mainMenu();
}

/**
 * Generate a compliance report for a repository
 */
async function generateComplianceReport(): Promise<void> {
  rl.question("Enter repository name: ", async (repoName) => {
    if (!repoName.trim()) {
      console.error("Error: Repository name is required.");
      return mainMenu();
    }

    try {
      // Get repository details
      const { data: repo } = await octokit.repos.get({
        owner: organization,
        repo: repoName.trim(),
      });

      // Get branch protection rules
      let branchProtection;
      try {
        const { data: protection } = await octokit.repos.getBranchProtection({
          owner: organization,
          repo: repoName.trim(),
          branch: repo.default_branch,
        });
        branchProtection = protection;
      } catch (error) {
        console.log(
          `No branch protection rules found for ${repoName} (${repo.default_branch}).`
        );
        branchProtection = null;
      }

      // Generate report
      let report = `# Compliance Report for ${repo.name}\n\n`;

      report += `## Repository Information\n`;
      report += `- Name: ${repo.name}\n`;
      report += `- Description: ${repo.description || "None"}\n`;
      report += `- Private: ${repo.private ? "Yes" : "No"}\n`;
      report += `- Default Branch: ${repo.default_branch}\n`;
      report += `- Created: ${new Date(
        repo.created_at
      ).toLocaleDateString()}\n`;
      report += `- Last Updated: ${new Date(
        repo.updated_at
      ).toLocaleDateString()}\n\n`;

      report += `## Branch Protection\n`;
      if (branchProtection) {
        report += `- Branch: ${repo.default_branch}\n`;

        if (branchProtection.required_status_checks) {
          report += `- Required Status Checks: ${
            branchProtection.required_status_checks.strict
              ? "Strict"
              : "Not Strict"
          }\n`;
          report += `  - Contexts: ${
            branchProtection.required_status_checks.contexts.join(", ") ||
            "None"
          }\n`;
        } else {
          report += `- Required Status Checks: Not enabled\n`;
        }

        if (branchProtection.required_pull_request_reviews) {
          const reviews = branchProtection.required_pull_request_reviews;
          report += `- Required Pull Request Reviews:\n`;
          report += `  - Required Approving Review Count: ${
            reviews.required_approving_review_count || "None"
          }\n`;
          report += `  - Dismiss Stale Reviews: ${
            reviews.dismiss_stale_reviews ? "Yes" : "No"
          }\n`;
          report += `  - Require Code Owner Reviews: ${
            reviews.require_code_owner_reviews ? "Yes" : "No"
          }\n`;
        } else {
          report += `- Required Pull Request Reviews: Not enabled\n`;
        }

        report += `- Enforce Admins: ${
          branchProtection.enforce_admins?.enabled ? "Yes" : "No"
        }\n`;
        report += `- Allow Force Pushes: ${
          branchProtection.allow_force_pushes?.enabled ? "Yes" : "No"
        }\n`;
        report += `- Allow Deletions: ${
          branchProtection.allow_deletions?.enabled ? "Yes" : "No"
        }\n`;
      } else {
        report += `- No branch protection rules configured\n`;
      }

      report += `\n## Security Features\n`;
      report += `- Vulnerability Alerts: ${
        repo.security_and_analysis?.advanced_security?.status === "enabled"
          ? "Enabled"
          : "Not Enabled"
      }\n`;
      report += `- Secret Scanning: ${
        repo.security_and_analysis?.secret_scanning?.status === "enabled"
          ? "Enabled"
          : "Not Enabled"
      }\n`;

      report += `\nGenerated by Repository Guardian CLI on ${new Date().toISOString()}\n`;

      // Save report to file
      const outputDir = path.join(process.cwd(), "reports");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      const filename = path.join(
        outputDir,
        `${repoName}-compliance-report-${new Date()
          .toISOString()
          .slice(0, 10)}.md`
      );
      fs.writeFileSync(filename, report);

      console.log(`Compliance report saved to ${filename}`);
    } catch (error) {
      console.error(
        `Error generating compliance report: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    mainMenu();
  });
}

/**
 * Main menu function
 */
function mainMenu(): void {
  displayMenu();

  rl.question("Select an option (1-5): ", async (option) => {
    switch (option.trim()) {
      case "1":
        await listRepositories();
        mainMenu();
        break;
      case "2":
        await scanRepository();
        break;
      case "3":
        await scanAllRepositories();
        break;
      case "4":
        await generateComplianceReport();
        break;
      case "5":
        console.log("Exiting Repository Guardian CLI. Goodbye!");
        rl.close();
        break;
      default:
        console.log("Invalid option. Please try again.");
        mainMenu();
        break;
    }
  });
}

// Start the CLI
console.log(`Repository Guardian CLI`);
console.log(`Organization: ${organization}`);
mainMenu();
