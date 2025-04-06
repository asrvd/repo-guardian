# Building a GitHub Repository Guardian with Pulumi - Part 2: Implementation Details and Advanced Usage

Welcome to the second part of our Repository Guardian series. In the first part, we set up our Pulumi project and learned the basics of the Repository Guardian. Now, let's dive deeper into the implementation details and explore more advanced usage scenarios.

## Detailed Implementation

Let's explore how each part of the Repository Guardian works.

### The Repository Guardian Class

At the heart of our solution is the `RepositoryGuardian` class. Let's look at its implementation in more detail:

```typescript
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
}
```

The class takes several configuration parameters and initializes a workflow scanner when GitHub credentials are available.

### Branch Protection

The `applyBranchProtection` method sets up branch protection rules for a repository:

```typescript
applyBranchProtection(repo: github.Repository): github.BranchProtection {
  return new github.BranchProtection(
    `${repo.name}-branch-protection`,
    {
      repositoryId: repo.nodeId,
      pattern: this.defaultBranch,
      requiredStatusChecks: [{
        contexts: this.requiredStatusChecks,
      }],
      requiredPullRequestReviews: [{
        requiredApprovingReviewCount: this.minReviewers,
      }],
      enforceAdmins: true,
      allowsForcePushes: false,
      allowsDeletions: false,
    },
    { provider: this.provider }
  );
}
```

These settings ensure that:
- The specified status checks must pass before merging
- Pull requests require a minimum number of approving reviews
- These rules apply to everyone, including administrators
- Force pushes and branch deletions are prohibited

_[INSERT SCREENSHOT: GitHub branch protection settings UI showing the rules applied]_

### Managing Secrets

The `configureSecrets` method handles setting up secrets for GitHub Actions:

```typescript
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
```

This allows us to securely manage secrets without exposing them in workflow files.

### Security Monitoring

The `monitorWorkflowSecurity` method sets up security monitoring for repositories:

```typescript
monitorWorkflowSecurity(repo: github.Repository): void {
  // Add a security policy file
  new github.RepositoryFile(
    `${repo.name}-security-policy`,
    {
      repository: repo.name,
      file: "SECURITY.md",
      content: `# Security Policy
      // Security policy content...
      `,
      branch: this.defaultBranch,
      commitMessage: "Add security policy",
      commitAuthor: "Repository Guardian",
      commitEmail: "security@example.com",
      overwriteOnCreate: true,
    },
    { provider: this.provider }
  );

  // Add a workflow file to scan for vulnerabilities
  new github.RepositoryFile(
    `${repo.name}-security-scan-workflow`,
    {
      repository: repo.name,
      file: ".github/workflows/security-scan.yml",
      content: `name: Security Scan
      // Workflow content...
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
```

This method creates:
1. A `SECURITY.md` file with vulnerability reporting guidelines
2. A GitHub Actions workflow that runs security scans using Trivy

### Workflow Security Scanner Implementation

Our `WorkflowsScanner` class analyzes GitHub Actions workflow files for security issues:

```typescript
// Define security rules
const securityRules = [
  {
    id: "no-plaintext-secrets",
    description: "Avoid hardcoded secrets in workflows",
    pattern: /(password|token|key|secret):\s*['"][^'"]+['"]/i,
    severity: "critical" as SecuritySeverity,
    remediation: "Use GitHub Secrets (secrets.*) instead of hardcoded values",
  },
  // More rules...
];

async scanRepository(repo: string): Promise<WorkflowScanResult> {
  // Get all workflow files
  const { data: workflowFiles } = await this.octokit.repos.getContent({
    owner: this.owner,
    repo: repo,
    path: ".github/workflows",
  });

  // Analyze workflow files
  // ...
}
```

The scanner identifies common security issues in workflow files, such as:
- Hardcoded secrets or credentials
- Using actions with floating version references
- Using third-party actions that could be compromised
- Potential script injection vulnerabilities

_[INSERT SCREENSHOT: Sample workflow security scan report showing identified issues]_

### The CLI Tool

Our CLI tool provides interactive options for manual scanning and reporting:

```typescript
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
      // More options...
    }
  });
}
```

The CLI is particularly useful for:
- Ad-hoc security checks
- Generating compliance reports for specific repositories
- Running manual scans before or after deploying changes

## Advanced Usage Scenarios

Now that we understand the implementation details, let's explore some advanced usage scenarios for the Repository Guardian.

### Scaling to Multiple Organizations

To manage repositories across multiple GitHub organizations:

```typescript
// Create a guardian instance for each organization
const organizations = ["org1", "org2", "org3"];

organizations.forEach(org => {
  const provider = new github.Provider(`github-provider-${org}`, {
    token: process.env.GITHUB_TOKEN,
    owner: org,
  });

  const guardian = new RepositoryGuardian(
    provider,
    org,
    defaultBranch,
    requiredStatusChecks,
    minReviewers
  );

  // Apply protections to repositories in this organization
  const repoNames = ["repo1", "repo2", "repo3"];
  repoNames.forEach(repoName => {
    guardian.protectRepository(repoName);
  });
});
```

### Custom Protection Profiles

You can create different protection profiles for different types of repositories:

```typescript
// Define protection profiles
const profiles = {
  standard: {
    branch: "main",
    statusChecks: ["tests", "linting"],
    reviewers: 1
  },
  sensitive: {
    branch: "main",
    statusChecks: ["tests", "linting", "security-scan"],
    reviewers: 2
  },
  critical: {
    branch: "main",
    statusChecks: ["tests", "linting", "security-scan", "compliance-check"],
    reviewers: 3
  }
};

// Apply a specific profile to a repository
function protectWithProfile(repoName: string, profile: string) {
  const config = profiles[profile];
  if (!config) {
    throw new Error(`Profile ${profile} not found`);
  }
  
  const guardian = new RepositoryGuardian(
    provider,
    organization,
    config.branch,
    config.statusChecks,
    config.reviewers
  );
  
  return guardian.protectRepository(repoName);
}

// Usage
const secureRepo = protectWithProfile("payment-service", "critical");
const standardRepo = protectWithProfile("documentation", "standard");
```

### Integration with CI/CD Pipelines

You can integrate Repository Guardian into your CI/CD pipeline to enforce security standards automatically:

```yaml
# .github/workflows/repository-guardian.yml
name: Repository Guardian

on:
  schedule:
    - cron: '0 0 * * *'  # Run daily
  workflow_dispatch:  # Allow manual triggering
  repository_dispatch:
    types: [repo-created]  # Run when new repos are created

jobs:
  protect-repositories:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Pulumi CLI
        run: curl -fsSL https://get.pulumi.com | sh
        
      - name: Configure Pulumi
        run: |
          pulumi login
          pulumi stack select dev
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          
      - name: Run Repository Guardian
        run: npm run start
        env:
          GITHUB_TOKEN: ${{ secrets.GUARDIAN_GITHUB_TOKEN }}
          GITHUB_ORGANIZATION: ${{ secrets.GITHUB_ORGANIZATION }}
```

This workflow will run daily and whenever it's manually triggered, ensuring that all repositories in your organization maintain the required security settings.

### Custom Compliance Reports

For organizations with specific compliance requirements, you can customize the compliance reports:

```typescript
generateCustomComplianceReport(repo: github.Repository, framework: string): pulumi.Output<string> {
  switch (framework) {
    case "soc2":
      return this.generateSOC2Report(repo);
    case "hipaa":
      return this.generateHIPAAReport(repo);
    case "pci":
      return this.generatePCIReport(repo);
    default:
      return this.generateComplianceReport(repo);
  }
}

generateSOC2Report(repo: github.Repository): pulumi.Output<string> {
  // Generate a SOC2-specific compliance report
  // ...
}
```

These custom reports can help demonstrate compliance with specific regulatory frameworks and security standards.

## Monitoring and Alerts

To ensure continuous protection, set up monitoring and alerts for security issues:

```typescript
async function setupSecurityAlerts(repo: github.Repository) {
  // Set up email notifications for detected workflow vulnerabilities
  // ...
  
  // Set up Slack notifications for branch protection changes
  // ...
  
  // Set up monitoring for new repositories without protection
  // ...
}
```

You could integrate this with services like PagerDuty, Slack, or Microsoft Teams to notify your security team when issues are detected.

## Extending Repository Guardian

Here are some ideas for extending the Repository Guardian:

### Adding Support for GitLab

You could extend the Guardian to support GitLab repositories:

```typescript
class GitLabRepositoryGuardian {
  // Similar implementation but using GitLab APIs
  // ...
}
```

### Implementing Auto-Remediation

Add auto-remediation for common security issues:

```typescript
async function autoRemediate(repo: string, issue: WorkflowSecurityIssue) {
  // Implement auto-fixes for common security issues
  // For example, replace hardcoded secrets with references to GitHub Secrets
  // ...
  
  // Create a pull request with the fixes
  // ...
}
```

### Integrate with Security Scanners

Integrate with additional security scanners like CodeQL, Snyk, or Dependabot:

```typescript
async function setupAdvancedSecurity(repo: github.Repository) {
  // Enable CodeQL scanning
  // ...
  
  // Configure Dependabot alerts
  // ...
  
  // Set up additional vulnerability scanners
  // ...
}
```

## Troubleshooting

Here are some common issues and their solutions:

### Token Permission Issues

If you encounter permission errors, make sure your GitHub token has the necessary scopes:
- `repo` for repository access
- `admin:org` for organization settings
- `admin:repo_hook` for repository hooks

### Organization Access

If the Repository Guardian can't access your organization, check:
1. That the token is associated with an account that has admin access
2. That the organization name is spelled correctly
3. That SSO is authorized if your organization uses SAML SSO

### Branch Protection Errors

If branch protection rules aren't being applied:
1. Verify the repository exists and is accessible
2. Check that the default branch matches the one specified in your configuration
3. Ensure the status checks you're requiring actually exist

## Conclusion

The Repository Guardian is a powerful tool for enforcing security best practices across your GitHub repositories. By automating the configuration of branch protection rules, security scanning, and compliance reporting, you can ensure that all repositories in your organization maintain a high security standard.

In this blog post, we've explored the implementation details and advanced usage scenarios for the Repository Guardian. With the knowledge gained, you should be able to adapt and extend the tool to meet your organization's specific security requirements.

Remember, security is an ongoing process, not a one-time setup. Regularly review and update your security settings, scan for new vulnerabilities, and adjust your protection profiles as your organization's needs evolve.

Happy coding, and stay secure! 