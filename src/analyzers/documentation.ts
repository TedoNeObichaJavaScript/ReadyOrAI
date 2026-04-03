import type { Finding, FunctionInfo } from '../types.js';
import type { SupportedLanguage } from '../utils/language-detect.js';
import { DEFAULT_THRESHOLDS } from '../types.js';

export function analyzeDocumentation(
  lines: string[],
  functions: FunctionInfo[],
  language: SupportedLanguage,
  thresholdOverrides?: Partial<typeof DEFAULT_THRESHOLDS>,
): Finding[] {
  const findings: Finding[] = [];

  // Check exported/public functions for missing docs
  for (const fn of functions) {
    if (fn.startLine < 1) continue;

    const hasDoc = hasDocComment(lines, fn.startLine - 1, language);
    const isExported = isExportedFunction(lines, fn.startLine - 1, language);

    if (isExported && !hasDoc) {
      findings.push({
        check: 'documentation',
        severity: 'warning',
        message: `Exported function '${fn.name}' lacks documentation`,
        line: fn.startLine,
        suggestion: `Add a ${getDocStyle(language)} comment describing purpose and parameters`,
      });
    }
  }

  // Comment-to-code ratio
  const { commentLines, codeLines } = countCommentAndCode(lines);
  if (codeLines > 50) {
    const ratio = commentLines / codeLines;
    const t = { ...DEFAULT_THRESHOLDS, ...thresholdOverrides };
    if (ratio < t.minCommentRatio) {
      findings.push({
        check: 'documentation',
        severity: 'info',
        message: `Low comment-to-code ratio (${(ratio * 100).toFixed(1)}%) — consider adding comments for complex logic`,
        suggestion: 'Add comments explaining "why", not "what"',
      });
    }
  }

  return findings;
}

function hasDocComment(lines: string[], fnLineIndex: number, language: SupportedLanguage): boolean {
  // Look up to 5 lines above the function for a doc comment
  for (let i = fnLineIndex - 1; i >= Math.max(0, fnLineIndex - 5); i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;

    // JSDoc / JavaDoc / C-style doc
    if (trimmed.startsWith('/**') || trimmed.startsWith('*/') || trimmed.startsWith('*')) return true;
    // Python docstring (triple quotes on previous line or same block)
    if (language === 'python' && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) return true;
    // Go doc comment
    if (language === 'go' && trimmed.startsWith('//')) return true;
    // Rust doc comment
    if (language === 'rust' && trimmed.startsWith('///')) return true;
    // Single-line comment directly above
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) return true;

    // If we hit a non-comment, non-blank line, stop looking
    break;
  }
  return false;
}

function isExportedFunction(lines: string[], fnLineIndex: number, language: SupportedLanguage): boolean {
  const line = lines[fnLineIndex]?.trim() || '';

  switch (language) {
    case 'javascript':
    case 'typescript':
      return line.startsWith('export ');
    case 'python':
      // Python: not starting with underscore
      return !/def\s+_/.test(line);
    case 'go':
      // Go: PascalCase function name
      return /^func\s+[A-Z]/.test(line);
    case 'rust':
      return line.startsWith('pub ');
    case 'java':
    case 'csharp':
    case 'kotlin':
      return /\bpublic\b/.test(line);
    default:
      return false;
  }
}

function getDocStyle(language: SupportedLanguage): string {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return 'JSDoc (/** ... */)';
    case 'python':
      return 'docstring (""" ... """)';
    case 'go':
      return '// comment';
    case 'rust':
      return '/// doc comment';
    case 'java':
      return 'Javadoc (/** ... */)';
    default:
      return 'doc comment';
  }
}

function countCommentAndCode(lines: string[]): { commentLines: number; codeLines: number } {
  let commentLines = 0;
  let codeLines = 0;
  let inBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (inBlock) {
      commentLines++;
      if (trimmed.includes('*/')) inBlock = false;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      commentLines++;
      if (!trimmed.includes('*/')) inBlock = true;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      commentLines++;
      continue;
    }
    codeLines++;
  }

  return { commentLines, codeLines };
}
