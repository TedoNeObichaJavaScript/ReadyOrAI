import type { FileAnalysis, DirectoryAnalysis, FileMetrics } from '../types.js';

export function formatFileAnalysis(analysis: FileAnalysis): string {
  const { filePath, language, metrics, findings } = analysis;
  const sections: string[] = [];

  sections.push(`## File: ${filePath}`);
  sections.push(`Language: ${language} | Lines: ${metrics.totalLines} | Functions: ${metrics.functionCount}`);
  sections.push('');

  // Metrics summary
  sections.push('### Metrics');
  sections.push(formatMetrics(metrics));
  sections.push('');

  // Findings
  if (findings.length === 0) {
    sections.push('### Findings');
    sections.push('No issues found. Code looks clean!');
  } else {
    const errors = findings.filter(f => f.severity === 'error');
    const warnings = findings.filter(f => f.severity === 'warning');
    const infos = findings.filter(f => f.severity === 'info');

    sections.push(`### Findings (${findings.length} total: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info)`);
    sections.push('');

    if (errors.length > 0) {
      sections.push('#### Errors');
      for (const f of errors) {
        sections.push(formatFinding(f));
      }
      sections.push('');
    }

    if (warnings.length > 0) {
      sections.push('#### Warnings');
      for (const f of warnings) {
        sections.push(formatFinding(f));
      }
      sections.push('');
    }

    if (infos.length > 0) {
      sections.push('#### Info');
      for (const f of infos) {
        sections.push(formatFinding(f));
      }
    }
  }

  return sections.join('\n');
}

export function formatDirectoryAnalysis(analysis: DirectoryAnalysis): string {
  const sections: string[] = [];

  sections.push(`## Directory: ${analysis.directoryPath}`);
  sections.push(`Files analyzed: ${analysis.filesAnalyzed} | Total findings: ${analysis.totalFindings}`);
  sections.push('');

  // Summary
  sections.push('### Summary');
  sections.push(`- Errors: ${analysis.findingsBySeverity.error}`);
  sections.push(`- Warnings: ${analysis.findingsBySeverity.warning}`);
  sections.push(`- Info: ${analysis.findingsBySeverity.info}`);
  sections.push('');

  if (Object.keys(analysis.findingsByCheck).length > 0) {
    sections.push('### Findings by Check');
    for (const [check, count] of Object.entries(analysis.findingsByCheck).sort((a, b) => b[1] - a[1])) {
      sections.push(`- ${check}: ${count}`);
    }
    sections.push('');
  }

  // Per-file summaries (only files with findings)
  const filesWithFindings = analysis.files.filter(f => f.findings.length > 0);
  if (filesWithFindings.length > 0) {
    sections.push('### Files with Issues');
    for (const file of filesWithFindings) {
      const errors = file.findings.filter(f => f.severity === 'error').length;
      const warnings = file.findings.filter(f => f.severity === 'warning').length;
      sections.push(`- **${file.filePath}**: ${errors} errors, ${warnings} warnings, ${file.findings.length} total`);
    }
  }

  return sections.join('\n');
}

export function formatMetricsOnly(metrics: FileMetrics, filePath: string): string {
  return [
    `## Metrics: ${filePath}`,
    formatMetrics(metrics),
  ].join('\n');
}

function formatMetrics(metrics: FileMetrics): string {
  return [
    `- Total lines: ${metrics.totalLines}`,
    `- Code lines: ${metrics.codeLines}`,
    `- Comment lines: ${metrics.commentLines}`,
    `- Blank lines: ${metrics.blankLines}`,
    `- Functions: ${metrics.functionCount}`,
    `- Max nesting depth: ${metrics.maxNestingDepth}`,
    `- Max cyclomatic complexity: ${metrics.maxCyclomaticComplexity}`,
    `- Avg function length: ${metrics.averageFunctionLength} lines`,
  ].join('\n');
}

function formatFinding(f: { severity: string; check: string; message: string; line?: number; suggestion?: string }): string {
  const loc = f.line ? ` (line ${f.line})` : '';
  const suggestion = f.suggestion ? ` → ${f.suggestion}` : '';
  return `- [${f.check}]${loc}: ${f.message}${suggestion}`;
}
