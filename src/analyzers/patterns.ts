import type { Finding } from '../types.js';

export function analyzePatterns(lines: string[]): Finding[] {
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // TODO/FIXME/HACK comments (check before skipping comments)
    const todoMatch = trimmed.match(/\b(TODO|FIXME|HACK|XXX|TEMP)\b[:\s]*(.*)/i);
    if (todoMatch) {
      findings.push({
        check: 'patterns',
        severity: 'info',
        message: `${todoMatch[1].toUpperCase()}: ${todoMatch[2].trim() || '(no description)'}`,
        line: lineNum,
      });
    }

    // Skip comments for remaining checks
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue;

    // Console/print statements left in code
    if (/\bconsole\.(log|debug|info|warn|error)\s*\(/.test(line)) {
      findings.push({
        check: 'patterns',
        severity: 'warning',
        message: `console.${line.match(/console\.(\w+)/)?.[1]} statement found`,
        line: lineNum,
        suggestion: 'Remove or replace with a proper logging library',
      });
    }

    // Empty catch blocks
    if (/\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      findings.push({
        check: 'patterns',
        severity: 'error',
        message: 'Empty catch block swallows errors silently',
        line: lineNum,
        suggestion: 'Log the error or handle it appropriately',
      });
    }

    // Multi-line empty catch (check next non-blank line)
    if (/\bcatch\s*\([^)]*\)\s*\{?\s*$/.test(trimmed)) {
      const nextNonBlank = findNextNonBlank(lines, i + 1);
      if (nextNonBlank !== null && lines[nextNonBlank].trim() === '}') {
        findings.push({
          check: 'patterns',
          severity: 'error',
          message: 'Empty catch block swallows errors silently',
          line: lineNum,
          suggestion: 'Log the error or handle it appropriately',
        });
      }
    }

    // Magic numbers (numeric literals not in common patterns)
    const magicMatch = line.match(/(?<!=\s*)(?<!\w)\b(\d+\.?\d*)\b(?!\s*[;,\]\)]?\s*\/\/)/g);
    if (magicMatch) {
      for (const num of magicMatch) {
        const val = parseFloat(num);
        // Skip common acceptable values
        if ([0, 1, -1, 2, 10, 100, 1000, 0.5].includes(val)) continue;
        // Skip array indices, loop bounds commonly
        if (/\[\s*\d+\s*\]/.test(line)) continue;
        // Skip imports, requires
        if (/\b(import|require|from)\b/.test(line)) continue;
        // Skip variable declarations with clear names
        if (/\b(const|let|var|val)\s+\w+\s*=\s*\d/.test(line)) continue;

        findings.push({
          check: 'patterns',
          severity: 'info',
          message: `Magic number ${num} — consider extracting to a named constant`,
          line: lineNum,
          suggestion: 'Define as a named constant for clarity',
        });
        break; // One finding per line
      }
    }

    // Nested ternaries
    if ((line.match(/\?/g) || []).length >= 2 && (line.match(/:/g) || []).length >= 2) {
      findings.push({
        check: 'patterns',
        severity: 'warning',
        message: 'Nested ternary operator reduces readability',
        line: lineNum,
        suggestion: 'Use if/else statements or extract into a function',
      });
    }

    // Long method chains (4+ chained calls)
    if (/(\.\w+\([^)]*\)){4,}/.test(line)) {
      findings.push({
        check: 'patterns',
        severity: 'info',
        message: 'Long method chain — consider breaking into intermediate variables',
        line: lineNum,
        suggestion: 'Store intermediate results in named variables for clarity',
      });
    }
  }

  return findings;
}

function findNextNonBlank(lines: string[], start: number): number | null {
  for (let i = start; i < lines.length && i < start + 3; i++) {
    if (lines[i].trim() !== '') return i;
  }
  return null;
}
