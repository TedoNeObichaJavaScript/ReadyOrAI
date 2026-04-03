import type { Finding } from '../types.js';
import type { SupportedLanguage } from '../utils/language-detect.js';

export function analyzeImports(lines: string[], language: SupportedLanguage): Finding[] {
  const findings: Finding[] = [];
  const importedSymbols = new Map<string, number>(); // symbol -> line number
  const content = lines.join('\n');

  // Extract imports based on language
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Wildcard / star imports
    if (language === 'javascript' || language === 'typescript') {
      if (/import\s+\*\s+as\s+/.test(line)) {
        findings.push({
          check: 'imports',
          severity: 'info',
          message: 'Wildcard import — may import more than needed',
          line: lineNum,
          suggestion: 'Import only the specific symbols you need',
        });
      }

      // Extract named imports
      const namedMatch = line.match(/import\s*\{([^}]+)\}\s*from/);
      if (namedMatch) {
        const symbols = namedMatch[1].split(',').map(s => {
          const parts = s.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        });
        for (const sym of symbols) {
          if (sym) importedSymbols.set(sym, lineNum);
        }
      }

      // Default imports
      const defaultMatch = line.match(/import\s+(\w+)\s+from/);
      if (defaultMatch && !line.includes('{')) {
        importedSymbols.set(defaultMatch[1], lineNum);
      }
    }

    if (language === 'python') {
      if (/from\s+\S+\s+import\s+\*/.test(line)) {
        findings.push({
          check: 'imports',
          severity: 'warning',
          message: 'Wildcard import (from X import *) — pollutes namespace',
          line: lineNum,
          suggestion: 'Import specific names instead',
        });
      }

      const pyMatch = line.match(/from\s+\S+\s+import\s+(.+)/);
      if (pyMatch && !pyMatch[1].includes('*')) {
        const symbols = pyMatch[1].split(',').map(s => {
          const parts = s.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        });
        for (const sym of symbols) {
          if (sym) importedSymbols.set(sym, lineNum);
        }
      }

      const pyImport = line.match(/^import\s+(\w+)(?:\s+as\s+(\w+))?/);
      if (pyImport) {
        importedSymbols.set(pyImport[2] || pyImport[1], lineNum);
      }
    }

    if (language === 'go') {
      // Go blank imports are fine (side effects), but flag others
      const goMatch = line.match(/^\s+"([^"]+)"\s*$/);
      if (goMatch) {
        const pkg = goMatch[1].split('/').pop() || goMatch[1];
        importedSymbols.set(pkg, lineNum);
      }
    }
  }

  // Check for unused imports (simple heuristic: search for symbol in non-import lines)
  for (const [symbol, lineNum] of importedSymbols) {
    if (symbol.length < 2) continue; // Skip single char aliases

    // Count occurrences outside import lines
    let usageCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (i + 1 === lineNum) continue; // Skip the import line itself
      const line = lines[i];
      // Skip other import lines
      if (/^\s*(import|from)\b/.test(line)) continue;
      if (new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(line)) {
        usageCount++;
        break;
      }
    }

    if (usageCount === 0) {
      findings.push({
        check: 'imports',
        severity: 'warning',
        message: `Import '${symbol}' appears unused`,
        line: lineNum,
        suggestion: 'Remove unused imports to keep the code clean',
      });
    }
  }

  // Check import organization (JS/TS: are imports grouped?)
  if (language === 'javascript' || language === 'typescript') {
    let lastImportLine = -1;
    let hasGap = false;
    let importCount = 0;

    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\b/.test(lines[i])) {
        if (lastImportLine >= 0 && i - lastImportLine > 2) {
          hasGap = true;
        }
        lastImportLine = i;
        importCount++;
      }
    }

    if (hasGap && importCount > 3) {
      findings.push({
        check: 'imports',
        severity: 'info',
        message: 'Imports are scattered — consider grouping them at the top',
        suggestion: 'Group imports: built-in modules, external packages, then local imports',
      });
    }
  }

  return findings;
}
