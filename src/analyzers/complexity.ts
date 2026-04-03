import type { Finding, FunctionInfo } from '../types.js';
import { DEFAULT_THRESHOLDS } from '../types.js';

export function analyzeComplexity(functions: FunctionInfo[]): Finding[] {
  const findings: Finding[] = [];
  const t = DEFAULT_THRESHOLDS;

  for (const fn of functions) {
    // Cyclomatic complexity
    if (fn.cyclomaticComplexity > t.maxCyclomaticComplexityError) {
      findings.push({
        check: 'complexity',
        severity: 'error',
        message: `Function '${fn.name}' has cyclomatic complexity ${fn.cyclomaticComplexity} (exceeds ${t.maxCyclomaticComplexityError})`,
        line: fn.startLine,
        suggestion: 'Break into smaller functions with single responsibilities',
      });
    } else if (fn.cyclomaticComplexity > t.maxCyclomaticComplexity) {
      findings.push({
        check: 'complexity',
        severity: 'warning',
        message: `Function '${fn.name}' has cyclomatic complexity ${fn.cyclomaticComplexity} (exceeds ${t.maxCyclomaticComplexity})`,
        line: fn.startLine,
        suggestion: 'Consider simplifying control flow or extracting helper functions',
      });
    }

    // Nesting depth
    if (fn.nestingDepth > t.maxNestingDepthError) {
      findings.push({
        check: 'complexity',
        severity: 'error',
        message: `Function '${fn.name}' has nesting depth ${fn.nestingDepth} (exceeds ${t.maxNestingDepthError})`,
        line: fn.startLine,
        suggestion: 'Use early returns, guard clauses, or extract nested logic',
      });
    } else if (fn.nestingDepth > t.maxNestingDepth) {
      findings.push({
        check: 'complexity',
        severity: 'warning',
        message: `Function '${fn.name}' has nesting depth ${fn.nestingDepth} (exceeds ${t.maxNestingDepth})`,
        line: fn.startLine,
        suggestion: 'Consider using early returns or guard clauses to reduce nesting',
      });
    }
  }

  return findings;
}

/** Estimate cyclomatic complexity from source lines (regex-based fallback). */
export function estimateCyclomaticComplexity(lines: string[], startLine: number, endLine: number): number {
  let complexity = 1; // base complexity
  const keywords = /\b(if|else\s+if|elif|for|while|case|catch|except|&&|\|\||\?)\b/g;

  for (let i = startLine; i <= endLine && i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue;

    let match;
    keywords.lastIndex = 0;
    while ((match = keywords.exec(line)) !== null) {
      complexity++;
    }
  }

  return complexity;
}

/** Estimate max nesting depth from indentation or brace counting. */
export function estimateNestingDepth(lines: string[], startLine: number, endLine: number): number {
  let maxDepth = 0;
  let currentDepth = 0;

  for (let i = startLine; i <= endLine && i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (ch === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
  }

  return maxDepth;
}
