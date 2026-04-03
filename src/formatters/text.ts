import type { FileAnalysis, DirectoryAnalysis } from '../types.js';

// ANSI color codes for terminal output (chalk-free fallback)
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const SEVERITY_COLORS: Record<string, string> = {
  error: RED,
  warning: YELLOW,
  info: BLUE,
};

const SEVERITY_ICONS: Record<string, string> = {
  error: 'x',
  warning: '!',
  info: 'i',
};

export function formatFileText(analysis: FileAnalysis): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}  ${analysis.filePath}${RESET}`);
  lines.push(`${DIM}  ${analysis.language} | ${analysis.metrics.totalLines} lines | ${analysis.metrics.functionCount} functions${RESET}`);
  lines.push('');

  if (analysis.findings.length === 0) {
    lines.push(`  ${GREEN}No issues found. Code looks clean!${RESET}`);
    lines.push('');
    return lines.join('\n');
  }

  const errors = analysis.findings.filter(f => f.severity === 'error');
  const warnings = analysis.findings.filter(f => f.severity === 'warning');
  const infos = analysis.findings.filter(f => f.severity === 'info');

  lines.push(`  ${RED}${errors.length} errors${RESET}  ${YELLOW}${warnings.length} warnings${RESET}  ${BLUE}${infos.length} info${RESET}`);
  lines.push('');

  for (const finding of analysis.findings) {
    const color = SEVERITY_COLORS[finding.severity];
    const icon = SEVERITY_ICONS[finding.severity];
    const loc = finding.line ? `${DIM}:${finding.line}${RESET}` : '';

    lines.push(`  ${color}${icon}${RESET} ${finding.message}${loc}`);
    if (finding.suggestion) {
      lines.push(`    ${DIM}${finding.suggestion}${RESET}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function formatDirectoryText(analysis: DirectoryAnalysis): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}  ReadyOrAI — Directory Analysis${RESET}`);
  lines.push(`${DIM}  ${analysis.directoryPath}${RESET}`);
  lines.push('');
  lines.push(`  Files: ${analysis.filesAnalyzed}  Findings: ${analysis.totalFindings}`);
  lines.push(`  ${RED}${analysis.findingsBySeverity.error} errors${RESET}  ${YELLOW}${analysis.findingsBySeverity.warning} warnings${RESET}  ${BLUE}${analysis.findingsBySeverity.info} info${RESET}`);
  lines.push('');

  // Show files with most issues first
  const filesWithIssues = analysis.files
    .filter(f => f.findings.length > 0)
    .sort((a, b) => {
      const aErr = a.findings.filter(f => f.severity === 'error').length;
      const bErr = b.findings.filter(f => f.severity === 'error').length;
      return bErr - aErr || b.findings.length - a.findings.length;
    });

  for (const file of filesWithIssues) {
    const errs = file.findings.filter(f => f.severity === 'error').length;
    const warns = file.findings.filter(f => f.severity === 'warning').length;
    lines.push(`  ${errs > 0 ? RED : warns > 0 ? YELLOW : BLUE}${SEVERITY_ICONS[errs > 0 ? 'error' : warns > 0 ? 'warning' : 'info']}${RESET} ${file.filePath} ${DIM}(${file.findings.length} issues)${RESET}`);
  }

  const cleanFiles = analysis.files.filter(f => f.findings.length === 0).length;
  if (cleanFiles > 0) {
    lines.push(`  ${GREEN}${cleanFiles} files with no issues${RESET}`);
  }

  lines.push('');
  return lines.join('\n');
}
