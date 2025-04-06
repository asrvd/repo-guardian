# Building a GitHub Repository Guardian with Pulumi and TypeScript

In today's world of rapid software development, security can sometimes take a backseat. However, implementing proper security practices from the beginning is crucial for building reliable and trustworthy software products. In this tutorial, I'll guide you through creating a "Repository Guardian" – a tool that helps enforce security best practices across your GitHub repositories automatically.

## What We'll Build

Repository Guardian is a security-focused tool that:

- Enforces repository best practices across an organization
- Automatically sets up branch protection rules
- Configures required status checks and code reviews
- Manages secrets and environment variables safely
- Generates compliance reports for security audits
- Monitors for and remediates security vulnerabilities in GitHub Actions workflows

We'll build this solution using [Pulumi](https://www.pulumi.com/) – an infrastructure as code tool that allows us to define cloud resources using familiar programming languages like TypeScript.

## Prerequisites

Before we start, make sure you have:

- Node.js 14+ installed
- A GitHub account with an organization
- Basic knowledge of TypeScript
- Basic understanding of GitHub repositories and security features

## Getting Started with Pulumi

If you're new to Pulumi, let's get you set up first.

### Installing Pulumi

Pulumi is an open-source infrastructure as code tool that allows you to define your infrastructure using familiar programming languages instead of custom configuration languages.

1. Install the Pulumi CLI by following the instructions on [Pulumi's website](https://www.pulumi.com/docs/install/) for your operating system.

   For macOS users, you can use Homebrew:
   ```bash
   brew install pulumi
   ```

   For Windows users, you can use Chocolatey:
   ```bash
   choco install pulumi
   ```

2. Verify the installation:
   ```bash
   pulumi version
   ```

3. Sign up for a free Pulumi account at [app.pulumi.com](https://app.pulumi.com/signup) if you don't have one already.

4. Log in to Pulumi:
   ```bash
   pulumi login
   ```

_[INSERT SCREENSHOT: Pulumi CLI installation and login process]_

### Creating a New Pulumi Project

Now, let's create a new Pulumi project for our Repository Guardian:

```bash
mkdir repository-guardian
cd repository-guardian
pulumi new typescript
```

You'll be asked a series of questions:
- Project name: `repository-guardian`
- Project description: `A security-focused tool to enforce GitHub repository best practices`
- Stack name: `dev` (or any other name you prefer)

_[INSERT SCREENSHOT: Creating a new Pulumi project]_

## Setting Up the Repository Guardian Project

With our Pulumi project ready, let's start building the Repository Guardian.

### Project Structure

Our project will consist of several files:
- `index.ts`: The main Pulumi program
- `workflows-scanner.ts`: Utility to scan GitHub workflows for security vulnerabilities
- `cli.ts`: Command-line interface for manual operations
- `.env`: Environment variables for local development

### Installing Dependencies

First, let's install the necessary dependencies:

```bash
npm install @pulumi/github @octokit/rest dotenv ts-node
```

### Environment Configuration

Create a `.env` file in your project root to store GitHub credentials:

```bash
# GitHub configuration
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_ORGANIZATION=your_github_organization_name_here

# Repository Guardian settings
DEFAULT_BRANCH=main
MIN_REVIEWERS=2
REQUIRED_STATUS_CHECKS=tests,linting
SCAN_FREQUENCY=daily
```

Also, create a `.env.example` file without sensitive information to include in your repository.

### Pulumi Configuration

Let's set up Pulumi to use our GitHub token securely:

```bash
pulumi config set --secret github:token <your-github-token>
pulumi config set repository-guardian:organization <your-github-organization>
```

You can further customize the configuration:

```bash
pulumi config set repository-guardian:default-branch main
pulumi config set repository-guardian:min-reviewers 2
pulumi config set repository-guardian:required-status-checks '["tests", "linting"]'
pulumi config set repository-guardian:scan-frequency daily
```

_[INSERT SCREENSHOT: Pulumi configuration command output]_

## Implementing the Repository Guardian

Now let's implement our Repository Guardian functionality. Here's how each component will work together:

### Main Pulumi Program (index.ts)

The main program:
1. Reads configuration from Pulumi config and environment variables
2. Initializes the GitHub provider with our credentials
3. Implements a `RepositoryGuardian` class to enforce security standards
4. Creates or updates repositories with proper security settings

Here's an overview of the key functionality:

```typescript
class RepositoryGuardian {
  // Apply branch protection rules to a repository
  applyBranchProtection(repo: github.Repository): github.BranchProtection {
    // ... implementation ...
  }

  // Configure secrets and environment variables
  configureSecrets(repo: github.Repository, secrets: Record<string, string>): void {
    // ... implementation ...
  }

  // Monitor for security vulnerabilities
  monitorWorkflowSecurity(repo: github.Repository): void {
    // ... implementation ...
  }

  // Generate compliance report
  generateComplianceReport(repo: github.Repository): pulumi.Output<string> {
    // ... implementation ...
  }

  // Apply all protection rules to a repository
  protectRepository(repoName: string, description: string = "", isPrivate: boolean = true): github.Repository {
    // ... implementation ...
  }
}
```

### Workflow Security Scanner (workflows-scanner.ts)

This utility scans GitHub Actions workflows for common security issues:
- Hardcoded secrets
- Actions not pinned to specific SHA versions
- Potential script injection vulnerabilities
- Third-party actions usage

The scanner produces detailed reports that can be used for compliance and remediation.

### Command-Line Interface (cli.ts)

For day-to-day operations, we'll create a CLI that allows:
- Listing repositories in an organization
- Scanning repositories for workflow security issues
- Generating compliance reports

## Step-by-Step Implementation

Let me walk you through implementing each part of the Repository Guardian. We'll start with the core functionality.

### Implementing the Workflow Scanner

First, let's implement our workflow security scanner:

```typescript
// workflows-scanner.ts
import { Octokit } from "@octokit/rest";
import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";

// Define severity type
type SecuritySeverity = "critical" | "high" | "medium" | "low";

/**
 * Security rules for GitHub Actions workflows
 */
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

export class WorkflowsScanner {
  // Scanner implementation
}

export interface WorkflowSecurityIssue {
  // Interface definition
}

export interface WorkflowScanResult {
  // Interface definition
}
```

The scanner uses regular expressions to identify potential security issues in workflow files.

### Implementing the Main Pulumi Program

Now, let's implement our main Pulumi program:

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { WorkflowsScanner } from "./workflows-scanner";

// Load environment variables
dotenv.config();

// Get configuration
const config = new pulumi.Config();
// Configuration loading...

// Initialize GitHub provider
const provider = new github.Provider("github-provider", {
  token: process.env.GITHUB_TOKEN,
  owner: organization,
});

/**
 * Class to manage GitHub repository protection rules
 */
class RepositoryGuardian {
  // Implementation...
}

// Initialize Repository Guardian
const guardian = new RepositoryGuardian(
  provider,
  organization,
  defaultBranch,
  requiredStatusChecks,
  minReviewers
);

// Use Repository Guardian
if (organization) {
  const repo = guardian.protectRepository(
    "example-repo",
    "An example repository protected by Repository Guardian"
  );
  
  // Configure secrets
  guardian.configureSecrets(repo, {
    API_KEY: "dummy-value-replace-in-production",
    DATABASE_URL: "dummy-value-replace-in-production",
  });
  
  // Export the compliance report
  export const repoComplianceReport = guardian.getComplianceReports();
}
```

### Implementing the CLI Tool

Finally, let's implement our CLI tool:

```typescript
// cli.ts
#!/usr/bin/env node

import * as pulumi from "@pulumi/pulumi";
import * as dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import { WorkflowsScanner } from "./workflows-scanner";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// CLI implementation...
```

## Deploying Repository Guardian

Now that we've implemented our Repository Guardian, let's deploy it using Pulumi.

```bash
npm run preview  # Preview changes without applying
npm run start    # Apply changes and create resources
```

_[INSERT SCREENSHOT: Pulumi deployment output showing resources being created]_

After deployment, Pulumi will create and configure the example repositories in your GitHub organization with all the security settings.

## Using the CLI Tool

The CLI tool provides an interactive way to work with repositories:

```bash
npm run cli
```

You'll see a menu with options:
1. List repositories in organization
2. Scan repository for workflow security issues
3. Scan all repositories for workflow security issues
4. Generate compliance report
5. Exit

_[INSERT SCREENSHOT: CLI tool menu and example output]_

## Testing the Repository Guardian

Here's how to test if your Repository Guardian is working correctly:

1. Check the GitHub organization to verify that example repositories have been created
2. Verify that branch protection rules are applied to the default branch
3. Check that the security policy file has been added
4. Confirm that the security scan workflow has been set up
5. Try to merge a pull request without the required approvals (it should be blocked)

_[INSERT SCREENSHOT: GitHub repository showing branch protection settings]_

## Customizing for Your Organization

To use Repository Guardian for your actual repositories:

1. Edit `index.ts` to include your repositories:
   ```typescript
   const myRepo = guardian.protectRepository(
     "my-actual-repo",
     "Description of my repository"
   );
   
   guardian.configureSecrets(myRepo, {
     "API_KEY": "dummy-value-replace-in-production",
     "DATABASE_URL": "dummy-value-replace-in-production",
   });
   ```

2. Apply the changes:
   ```bash
   npm run start
   ```

## Security Considerations

When using Repository Guardian, keep these security considerations in mind:

1. Store your GitHub token securely and never commit it to your repository
2. Use Pulumi's secret management to protect sensitive information
3. Regularly rotate your GitHub tokens
4. Run security scans periodically to catch new vulnerabilities

## Continuous Integration

For larger organizations, consider setting up a CI/CD pipeline to automatically run Repository Guardian:

1. Set up a GitHub Actions workflow to run Pulumi
2. Schedule regular runs to ensure new repositories are protected
3. Generate and store compliance reports for audit purposes

## Conclusion

Repository Guardian demonstrates how infrastructure as code can be used not just for provisioning servers and databases but also for enforcing security policies and best practices across your organization's GitHub repositories.

By automating these security checks and configurations, you can ensure that your repositories maintain a high security standard without requiring manual intervention from developers or security teams.

The full source code for this project is available on GitHub at [repository-guardian](https://github.com/yourusername/repository-guardian).

## Further Reading

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) 