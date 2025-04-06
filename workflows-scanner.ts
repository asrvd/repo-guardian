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
  {
    id: "pin-actions-versions",
    description: "Pin actions to a specific SHA",
    pattern: /uses:\s*([^@]+)@(main|master|latest|\d+)/i,
    severity: "high" as SecuritySeverity,
    remediation:
      "Pin actions to a full length commit SHA instead of using branch names or version tags",
  },
  {
    id: "third-party-action-review",
    description: "Review third-party actions",
    pattern: /uses:\s*(?!actions\/|\.\/)/,
    severity: "medium" as SecuritySeverity,
    remediation:
      "Review third-party actions before using them or consider creating internal actions",
  },
  {
    id: "script-injection",
    description: "Potential script injection via user inputs",
    pattern: /\$\{\{\s*github\.event\.issue\.title\s*\}\}/,
    severity: "high" as SecuritySeverity,
    remediation: "Sanitize user inputs before using them in scripts",
  },
];

/**
 * Class to scan GitHub Actions workflows for security vulnerabilities
 */
export class WorkflowsScanner {
  private octokit: Octokit;
  private owner: string;

  constructor(token: string, owner: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
  }

  /**
   * Scan a specific repository for workflow security issues
   */
  async scanRepository(repo: string): Promise<WorkflowScanResult> {
    try {
      // Get all workflow files
      const { data: workflowFiles } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: repo,
        path: ".github/workflows",
      });

      if (!Array.isArray(workflowFiles)) {
        return {
          repository: repo,
          success: false,
          message: "No workflows directory found or not a directory",
          issues: [],
        };
      }

      const issues: WorkflowSecurityIssue[] = [];

      // Analyze each workflow file
      for (const file of workflowFiles) {
        if (
          file.type !== "file" ||
          (!file.name.endsWith(".yml") && !file.name.endsWith(".yaml"))
        ) {
          continue;
        }

        const { data: content } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: repo,
          path: file.path,
        });

        if ("content" in content) {
          const decodedContent = Buffer.from(
            content.content,
            "base64"
          ).toString();
          const fileIssues = this.analyzeWorkflow(file.name, decodedContent);
          issues.push(...fileIssues);
        }
      }

      return {
        repository: repo,
        success: true,
        issues,
        message:
          issues.length > 0
            ? `Found ${issues.length} security issues in workflows`
            : "No security issues found in workflows",
      };
    } catch (error) {
      return {
        repository: repo,
        success: false,
        message: `Error scanning workflows: ${
          error instanceof Error ? error.message : String(error)
        }`,
        issues: [],
      };
    }
  }

  /**
   * Analyze a workflow file for security issues
   */
  private analyzeWorkflow(
    filename: string,
    content: string
  ): WorkflowSecurityIssue[] {
    const issues: WorkflowSecurityIssue[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const rule of securityRules) {
        if (rule.pattern.test(line)) {
          issues.push({
            file: filename,
            line: lineNumber,
            rule: rule.id,
            description: rule.description,
            severity: rule.severity,
            remediation: rule.remediation,
            content: line.trim(),
          });
        }
      }
    }

    return issues;
  }

  /**
   * Generate a markdown report of workflow security issues
   */
  generateReport(scanResult: WorkflowScanResult): string {
    let report = `# Workflow Security Scan Report for ${scanResult.repository}\n\n`;

    if (!scanResult.success) {
      report += `## Error\n\n${scanResult.message}\n\n`;
      return report;
    }

    if (scanResult.issues.length === 0) {
      report +=
        "## Summary\n\nNo security issues found in workflows. Good job!\n\n";
      return report;
    }

    // Group issues by severity
    const criticalIssues = scanResult.issues.filter(
      (issue) => issue.severity === "critical"
    );
    const highIssues = scanResult.issues.filter(
      (issue) => issue.severity === "high"
    );
    const mediumIssues = scanResult.issues.filter(
      (issue) => issue.severity === "medium"
    );
    const lowIssues = scanResult.issues.filter(
      (issue) => issue.severity === "low"
    );

    report += "## Summary\n\n";
    report += `- Critical: ${criticalIssues.length}\n`;
    report += `- High: ${highIssues.length}\n`;
    report += `- Medium: ${mediumIssues.length}\n`;
    report += `- Low: ${lowIssues.length}\n\n`;

    // Report issues by severity
    if (criticalIssues.length > 0) {
      report += "## Critical Issues\n\n";
      report += this.formatIssues(criticalIssues);
    }

    if (highIssues.length > 0) {
      report += "## High Issues\n\n";
      report += this.formatIssues(highIssues);
    }

    if (mediumIssues.length > 0) {
      report += "## Medium Issues\n\n";
      report += this.formatIssues(mediumIssues);
    }

    if (lowIssues.length > 0) {
      report += "## Low Issues\n\n";
      report += this.formatIssues(lowIssues);
    }

    return report;
  }

  /**
   * Format issues for the markdown report
   */
  private formatIssues(issues: WorkflowSecurityIssue[]): string {
    let result = "";

    for (const issue of issues) {
      result += `### ${issue.rule}\n\n`;
      result += `**File**: \`${issue.file}\` (line ${issue.line})\n\n`;
      result += `**Description**: ${issue.description}\n\n`;
      result += `**Code**:\n\`\`\`yaml\n${issue.content}\n\`\`\`\n\n`;
      result += `**Remediation**: ${issue.remediation}\n\n`;
      result += "---\n\n";
    }

    return result;
  }
}

/**
 * Interface for a workflow security issue
 */
export interface WorkflowSecurityIssue {
  file: string;
  line: number;
  rule: string;
  description: string;
  severity: SecuritySeverity;
  remediation: string;
  content: string;
}

/**
 * Interface for the result of a workflow scan
 */
export interface WorkflowScanResult {
  repository: string;
  success: boolean;
  message: string;
  issues: WorkflowSecurityIssue[];
}
