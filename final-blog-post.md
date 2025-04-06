*This is a submission for the [Pulumi Deploy and Document Challenge](https://dev.to/challenges/pulumi): Get Creative with Pulumi and GitHub*

## What I Built

I built **Repository Guardian** - a security automation tool that enforces best practices across GitHub repositories using Pulumi's infrastructure as code approach. 

Repository Guardian handles:
- Automatic branch protection rules
- Required code reviews and status checks
- Secure secrets management
- Security policy creation and scanning workflows
- GitHub Actions workflow vulnerability scanning
- Compliance reporting for security audits

Instead of manually configuring each repository's security settings (which is time-consuming and error-prone), Repository Guardian lets you define security as code and consistently apply it across your entire organization.

## Live Demo Link

[Repository Guardian Demo Video](https://youtu.be/your-demo-video-id) - [INSERT DEMO VIDEO LINK]

## Project Repo

{% github asrvd/repository-guardian %}

## My Journey

### The Problem

Working with multiple GitHub repositories across an organization presents a significant security challenge. Each repository needs proper branch protection, code review requirements, and security scanning. Configuring these manually is tedious and inconsistent.

I wanted to solve this by creating a tool that would:
1. Automatically apply consistent security settings
2. Be easily customizable for different repository types
3. Generate compliance reports for audits
4. Detect security vulnerabilities in GitHub Actions workflows

### Building the Solution

I started by exploring the GitHub API to understand what security configurations were possible. Then, I decided to use Pulumi with TypeScript to define these configurations as code.

The project evolved into three main components:

1. **Core Pulumi Program**: Manages GitHub repositories and security settings
2. **Workflow Security Scanner**: Analyzes GitHub Actions for vulnerabilities
3. **CLI Tool**: Provides an interactive interface for manual operations

#### Step 1: Setting Up Pulumi

I began by creating a new Pulumi TypeScript project and installing the necessary dependencies:

```bash
mkdir repository-guardian
cd repository-guardian
pulumi new typescript
npm install @pulumi/github @octokit/rest dotenv ts-node
```

#### Step 2: Implementing the Repository Guardian Class

The heart of the solution is the `RepositoryGuardian` class that manages repository security:

```typescript
class RepositoryGuardian {
  // Apply branch protection rules
  applyBranchProtection(repo: github.Repository) {
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
      }
    );
  }

  // More methods for security configuration...
}
```

#### Step 3: Creating the Workflow Scanner

One of the most challenging parts was building the workflow scanner to detect security vulnerabilities in GitHub Actions:

```typescript
const securityRules = [
  {
    id: "no-plaintext-secrets",
    description: "Avoid hardcoded secrets in workflows",
    pattern: /(password|token|key|secret):\s*['"][^'"]+['"]/i,
    severity: "critical",
    remediation: "Use GitHub Secrets (secrets.*) instead of hardcoded values",
  },
  // More security rules...
];
```

I used regular expressions to detect patterns like hardcoded secrets, unpinned GitHub Actions, and potential script injection vulnerabilities.

#### Step 4: Building the CLI Tool

To make the tool more user-friendly, I created an interactive CLI:

```typescript
function mainMenu(): void {
  console.log("\n=== Repository Guardian CLI ===");
  console.log("1. List repositories in organization");
  console.log("2. Scan repository for workflow security issues");
  console.log("3. Scan all repositories for workflow security issues");
  console.log("4. Generate compliance report");
  console.log("5. Exit");
  
  // Handle user selection...
}
```

### Challenges I Faced

#### Type Definitions for Branch Protection

One significant challenge was getting the TypeScript types right for branch protection rules. The Pulumi GitHub provider had some type definition issues that required careful handling:

```typescript
// Initial attempt (caused TypeScript errors)
requiredStatusChecks: {
  strict: true,
  contexts: this.requiredStatusChecks,
},

// Fixed version
requiredStatusChecks: [{
  contexts: this.requiredStatusChecks,
}],
```

I had to carefully read the Pulumi GitHub provider documentation and experiment to get the correct type structure.

#### Error Handling in the CLI

Another challenge was proper error handling in the CLI tool, especially when interacting with the GitHub API:

```typescript
try {
  const result = await scanner.scanRepository(repoName.trim());
  // Process result...
} catch (error) {
  console.error(
    `Error scanning repository: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}
```

I learned to add comprehensive error handling throughout the application to handle GitHub API rate limits, permissions issues, and network errors gracefully.

### What I Learned

This project taught me several valuable lessons:

1. **Infrastructure as Code for Security**: Using Pulumi to define security configurations provides consistency, version control, and automation benefits.

2. **TypeScript Type Safety**: Properly typing API responses and configurations catches errors early and improves code reliability.

3. **GitHub Security Best Practices**: Deep diving into GitHub's security features gave me insights into protection mechanisms and common vulnerabilities.

4. **Pulumi State Management**: Pulumi's state management makes it easy to update and maintain configurations over time.

## Using Pulumi with GitHub

Pulumi was the perfect choice for this project for several reasons:

### 1. Using Real Programming Languages

Unlike other IaC tools that use custom configuration languages, Pulumi lets me use TypeScript, which provided several advantages:

```typescript
// This kind of conditional logic is much cleaner in TypeScript
if (organization) {
  const repo = guardian.protectRepository(
    "example-repo",
    "An example repository protected by Repository Guardian"
  );
  
  guardian.configureSecrets(repo, {
    API_KEY: "dummy-value-replace-in-production",
    DATABASE_URL: "dummy-value-replace-in-production",
  });
  
  complianceReport = guardian.getComplianceReports();
} else {
  console.log("No organization specified.");
  complianceReport = pulumi.output("No organization specified");
}
```

This allowed me to implement complex logic, use proper error handling, and create reusable components more easily than would be possible with YAML or HCL.

### 2. GitHub Provider Capabilities

Pulumi's GitHub provider gives access to almost all GitHub API functionality, making it possible to:

```typescript
// Create repositories
const repo = new github.Repository(repoName, {
  name: repoName,
  description: description,
  visibility: isPrivate ? "private" : "public",
  hasIssues: true,
  vulnerabilityAlerts: true,
  deleteBranchOnMerge: true,
});

// Add files to repositories
new github.RepositoryFile(
  `${repo.name}-security-policy`,
  {
    repository: repo.name,
    file: "SECURITY.md",
    content: securityPolicyContent,
    branch: defaultBranch,
  }
);

// Manage secrets
new github.ActionsSecret(
  `${repo.name}-${secretName}-secret`,
  {
    repository: repo.name,
    secretName: secretName,
    plaintextValue: secretValue,
  }
);
```

### 3. Secure Secrets Management

Pulumi's secret management was crucial for handling sensitive GitHub tokens securely:

```bash
# Securely storing the GitHub token
pulumi config set --secret github:token <your-github-token>
```

This ensures tokens are encrypted at rest and never exposed in your code or version control.

### 4. Easy Updates and Maintenance

When GitHub introduces new security features or best practices change, updating the Repository Guardian is straightforward:

```typescript
// Adding a new security feature is as simple as adding a new method
monitorDependabotAlerts(repo: github.Repository): void {
  // Configure Dependabot alerts...
}
```

Then I can deploy the changes with `pulumi up`, and Pulumi's state management takes care of applying only the necessary updates.

### Why This Approach Is Better Than Alternatives

Before building this tool, I considered several alternatives:

1. **GitHub Organization Settings**: These only cover basic settings and don't allow for repository-specific customization.

2. **GitHub Actions Workflows**: While useful for CI/CD, they're not ideal for managing infrastructure and don't provide the same state management benefits.

3. **Custom Scripts Using GitHub API**: Would require building state management from scratch and handling all error cases manually.

Pulumi provided the perfect balance of power, flexibility, and ease of use for this security automation use case.

## Next Steps

I plan to expand Repository Guardian with:

1. Support for more GitHub security features like Dependabot alerts
2. Auto-remediation capability for common security issues
3. A web dashboard for monitoring security status
4. Support for multiple GitHub organizations
5. Integration with additional security scanning tools

I hope this project inspires you to explore how infrastructure as code with Pulumi can improve your GitHub security posture. Security doesn't have to be manual or inconsistent when you have the right tools! 