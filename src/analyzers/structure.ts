import type { Finding, FunctionInfo } from '../types.js';
import { DEFAULT_THRESHOLDS } from '../types.js';

export function analyzeStructure(lines: string[], functions: FunctionInfo[], filePath: string, thresholdOverrides?: Partial<typeof DEFAULT_THRESHOLDS>): Finding[] {
  const findings: Finding[] = [];
  const t = { ...DEFAULT_THRESHOLDS, ...thresholdOverrides };

  // File length
  if (lines.length > t.maxFileLinesError) {
    findings.push({
      check: 'structure',
      severity: 'error',
      message: `File has ${lines.length} lines (exceeds ${t.maxFileLinesError} limit)`,
      suggestion: 'Split into smaller, focused modules',
    });
  } else if (lines.length > t.maxFileLines) {
    findings.push({
      check: 'structure',
      severity: 'warning',
      message: `File has ${lines.length} lines (exceeds ${t.maxFileLines} recommended)`,
      suggestion: 'Consider splitting into smaller modules',
    });
  }

  // Function length
  for (const fn of functions) {
    if (fn.bodyLines > t.maxFunctionLinesError) {
      findings.push({
        check: 'structure',
        severity: 'error',
        message: `Function '${fn.name}' has ${fn.bodyLines} lines (exceeds ${t.maxFunctionLinesError} limit)`,
        line: fn.startLine,
        suggestion: 'Extract helper functions to reduce length',
      });
    } else if (fn.bodyLines > t.maxFunctionLines) {
      findings.push({
        check: 'structure',
        severity: 'warning',
        message: `Function '${fn.name}' has ${fn.bodyLines} lines (exceeds ${t.maxFunctionLines} recommended)`,
        line: fn.startLine,
        suggestion: 'Consider extracting helper functions',
      });
    }
  }

  // Parameter count
  for (const fn of functions) {
    if (fn.parameterCount > t.maxParametersError) {
      findings.push({
        check: 'structure',
        severity: 'error',
        message: `Function '${fn.name}' has ${fn.parameterCount} parameters (exceeds ${t.maxParametersError} limit)`,
        line: fn.startLine,
        suggestion: 'Use an options object or split the function',
      });
    } else if (fn.parameterCount > t.maxParameters) {
      findings.push({
        check: 'structure',
        severity: 'warning',
        message: `Function '${fn.name}' has ${fn.parameterCount} parameters (exceeds ${t.maxParameters} recommended)`,
        line: fn.startLine,
        suggestion: 'Consider using an options object',
      });
    }
  }

  // Line length
  for (let i = 0; i < lines.length; i++) {
    const len = lines[i].length;
    if (len > t.maxLineLengthError) {
      findings.push({
        check: 'structure',
        severity: 'error',
        message: `Line ${i + 1} has ${len} characters (exceeds ${t.maxLineLengthError})`,
        line: i + 1,
        suggestion: 'Break into multiple lines',
      });
    } else if (len > t.maxLineLengthWarning) {
      findings.push({
        check: 'structure',
        severity: 'warning',
        message: `Line ${i + 1} has ${len} characters (exceeds ${t.maxLineLengthWarning})`,
        line: i + 1,
        suggestion: 'Consider breaking into multiple lines',
      });
    }
  }

  return findings;
}
