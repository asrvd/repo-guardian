# Repository Guardian

A security-focused Pulumi application that enforces repository best practices across a GitHub organization.

## Features

- **Branch Protection Rules**: Automatically configure branch protection rules for your repositories
- **Code Review Requirements**: Enforce code reviews with configurable minimum reviewer counts
- **Status Check Requirements**: Require specific status checks to pass before merging
- **Secrets Management**: Safely manage secrets and environment variables
- **Compliance Reporting**: Generate compliance reports for security audits
- **Workflow Security**: Monitor for and remediate security vulnerabilities in GitHub Actions workflows

## Prerequisites

- Node.js 14+
- Pulumi CLI installed
- GitHub Personal Access Token with appropriate permissions
  - `repo` (Full control of private repositories)
  - `admin:org` (Full control of orgs and teams)
  - `admin:repo_hook` (Full control of repository hooks)

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file and fill in your GitHub token and organization:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your GitHub credentials and preferred settings.

5. Set up your Pulumi configuration:

```bash
# Set your GitHub token securely
pulumi config set --secret github:token <your-github-token>

# Set your organization
pulumi config set repository-guardian:organization your-github-organization

# Configure other settings as needed
pulumi config set repository-guardian:default-branch main
pulumi config set repository-guardian:min-reviewers 2
pulumi config set repository-guardian:required-status-checks "[\"tests\", \"linting\"]"
pulumi config set repository-guardian:scan-frequency daily
```

## Usage

### Deploy the Repository Guardian

```bash
pulumi up
```

This will:
1. Apply branch protection rules to specified repositories
2. Configure required status checks and code reviews
3. Set up security scanning workflows
4. Generate compliance reports

### Customize Repositories

Edit the `index.ts` file to protect specific repositories:

```typescript
// Protect a specific repository
const myRepo = guardian.protectRepository("my-repo", "My important project");

// Configure repository-specific secrets
guardian.configureSecrets(myRepo, {
  "API_KEY": "dummy-value-replace-in-production",
  "DATABASE_URL": "dummy-value-replace-in-production",
});
```

### Scan for Workflow Security Issues

The Repository Guardian includes a utility to scan GitHub Actions workflows for security vulnerabilities. This is an async function that could be triggered periodically in a production scenario.

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `repository-guardian:organization` | GitHub organization name | (Required) |
| `repository-guardian:default-branch` | Default branch name | `main` |
| `repository-guardian:required-status-checks` | Required status checks for PRs | `["tests", "linting"]` |
| `repository-guardian:min-reviewers` | Minimum number of reviewers required | `2` |
| `repository-guardian:scan-frequency` | How often to scan for vulnerabilities | `daily` |

## Security Benefits

- **Prevents Force Pushes**: Protects against history rewriting
- **Requires Code Reviews**: Ensures code quality and prevents malicious changes
- **Status Check Enforcement**: Verifies all tests pass before merging
- **Admin Enforcement**: Applies rules even to repository administrators
- **Secret Scanning**: Prevents accidental commit of sensitive information
- **Vulnerability Monitoring**: Checks for security issues in dependencies and workflows

## License

MIT 