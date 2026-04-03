#!/usr/bin/env node
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { watch } from 'node:fs';
import { analyzeFile, analyzeDirectory } from './analyzers/index.js';
import { formatFileText, formatDirectoryText } from './formatters/text.js';
import { formatFileSarif, formatDirectorySarif } from './formatters/sarif.js';
import { loadConfig, mergeConfig } from './utils/config.js';
import type { CheckName, AnalyzerOptions } from './types.js';

const VERSION = '0.1.0';

const HELP = `
  ReadyOrAI — Zero-cost code inspector

  Usage:
    ready @<file>              Inspect a single file
    ready @<directory>         Inspect a directory
    AI                         Inspect current directory
    AI @<file>                 Inspect a file

  Options:
    --checks <list>            Comma-separated checks (complexity,naming,structure,patterns,imports,documentation,security,duplication)
    --severity <level>         Minimum severity: info, warning, error
    --json                     Output as JSON
    --sarif                    Output as SARIF (for GitHub Code Scanning)
    --watch, -w                Re-analyze on file changes
    --version, -v              Show version
    --help, -h                 Show this help

  Exit codes:
    0   No issues found
    1   Warnings found
    2   Errors found
    3   Runtime error
`;

type OutputFormat = 'text' | 'json' | 'sarif';

async function runAnalysis(
  resolved: string,
  isDir: boolean,
  options: Partial<AnalyzerOptions>,
  format: OutputFormat,
): Promise<{ errors: number; warnings: number }> {
  let errorCount = 0;
  let warningCount = 0;

  if (isDir) {
    const analysis = await analyzeDirectory(resolved, undefined, 50, options);
    errorCount = analysis.findingsBySeverity.error;
    warningCount = analysis.findingsBySeverity.warning;

    if (format === 'json') console.log(JSON.stringify(analysis, null, 2));
    else if (format === 'sarif') console.log(formatDirectorySarif(analysis));
    else console.log(formatDirectoryText(analysis));
  } else {
    const analysis = await analyzeFile(resolved, options);
    errorCount = analysis.findings.filter(f => f.severity === 'error').length;
    warningCount = analysis.findings.filter(f => f.severity === 'warning').length;

    if (format === 'json') console.log(JSON.stringify(analysis, null, 2));
    else if (format === 'sarif') console.log(formatFileSarif(analysis));
    else console.log(formatFileText(analysis));
  }

  return { errors: errorCount, warnings: warningCount };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`readyorai v${VERSION}`);
    process.exit(0);
  }

  // Parse flags
  const format: OutputFormat = args.includes('--sarif') ? 'sarif' : args.includes('--json') ? 'json' : 'text';
  const watchMode = args.includes('--watch') || args.includes('-w');
  const checksIndex = args.indexOf('--checks');
  const severityIndex = args.indexOf('--severity');

  let checks: CheckName[] | undefined;
  if (checksIndex >= 0 && args[checksIndex + 1]) {
    checks = args[checksIndex + 1].split(',').map(c => c.trim()) as CheckName[];
  }

  let severity: 'info' | 'warning' | 'error' = 'info';
  if (severityIndex >= 0 && args[severityIndex + 1]) {
    severity = args[severityIndex + 1] as 'info' | 'warning' | 'error';
  }

  // Find target (strip @ prefix)
  let target: string | null = null;
  for (const arg of args) {
    if (arg.startsWith('@')) {
      target = arg.slice(1);
      break;
    }
    if (!arg.startsWith('-') && arg !== args[checksIndex + 1] && arg !== args[severityIndex + 1]) {
      if (checksIndex >= 0 && args.indexOf(arg) === checksIndex + 1) continue;
      if (severityIndex >= 0 && args.indexOf(arg) === severityIndex + 1) continue;
      target = arg;
      break;
    }
  }

  if (!target) {
    target = '.';
  }

  const resolved = path.resolve(target);

  try {
    const stat = await fs.stat(resolved);
    const isDir = stat.isDirectory();
    const configDir = isDir ? resolved : path.dirname(resolved);
    const fileConfig = await loadConfig(configDir);
    const merged = mergeConfig(fileConfig, {
      checks: checks ?? undefined,
      severityThreshold: severity,
    });
    const options: Partial<AnalyzerOptions> = {
      checks: merged.checks as CheckName[] ?? ['complexity', 'naming', 'structure', 'patterns', 'imports', 'documentation', 'security', 'duplication'] as CheckName[],
      severityThreshold: merged.severityThreshold ?? severity,
      thresholds: merged.thresholds,
      rules: merged.rules,
      ignore: merged.ignore,
    };

    if (watchMode) {
      console.log(`\x1b[36mWatching ${resolved} for changes...\x1b[0m\n`);
      await runAnalysis(resolved, isDir, options, format);

      let debounce: ReturnType<typeof setTimeout> | null = null;
      watch(resolved, { recursive: isDir }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(async () => {
          console.clear();
          console.log(`\x1b[36mRe-analyzing (${new Date().toLocaleTimeString()})...\x1b[0m\n`);
          try {
            await runAnalysis(resolved, isDir, options, format);
          } catch (err) {
            console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }, 300);
      });
    } else {
      const { errors, warnings } = await runAnalysis(resolved, isDir, options, format);
      if (errors > 0) process.exit(2);
      if (warnings > 0) process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(3);
  }
}

main();
