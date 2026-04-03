#!/usr/bin/env node
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { analyzeFile, analyzeDirectory } from './analyzers/index.js';
import { formatFileText, formatDirectoryText } from './formatters/text.js';
import type { CheckName } from './types.js';

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
    --version, -v              Show version
    --help, -h                 Show this help
`;

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
  const jsonOutput = args.includes('--json');
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
      // Bare path without @
      if (checksIndex >= 0 && args.indexOf(arg) === checksIndex + 1) continue;
      if (severityIndex >= 0 && args.indexOf(arg) === severityIndex + 1) continue;
      target = arg;
      break;
    }
  }

  // Default to current directory
  if (!target) {
    target = '.';
  }

  const resolved = path.resolve(target);

  try {
    const stat = await fs.stat(resolved);

    if (stat.isDirectory()) {
      const analysis = await analyzeDirectory(resolved, undefined, 50, checks ? { checks, severityThreshold: severity } : undefined);

      if (jsonOutput) {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        console.log(formatDirectoryText(analysis));
      }
    } else {
      const analysis = await analyzeFile(resolved, checks ? { checks, severityThreshold: severity } : undefined);

      if (jsonOutput) {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        console.log(formatFileText(analysis));
      }
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
