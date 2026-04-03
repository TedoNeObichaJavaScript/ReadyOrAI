import { describe, it, expect } from 'vitest';
import { analyzeDocumentation } from '../../../src/analyzers/documentation.js';
import type { FunctionInfo } from '../../../src/types.js';

function makeFn(name: string, startLine: number): FunctionInfo {
  return { name, startLine, endLine: startLine + 5, parameterCount: 1, bodyLines: 4, nestingDepth: 1, cyclomaticComplexity: 1 };
}

describe('documentation analyzer', () => {
  it('flags exported functions without docs in TS', () => {
    const lines = [
      'export function processData(input: string) {',
      '  return input.trim();',
      '}',
    ];
    const findings = analyzeDocumentation(lines, [makeFn('processData', 1)], 'typescript');
    expect(findings.some(f => f.message.includes("'processData'") && f.message.includes('lacks documentation'))).toBe(true);
  });

  it('does not flag documented exported functions', () => {
    const lines = [
      '/** Process the input data */',
      'export function processData(input: string) {',
      '  return input.trim();',
      '}',
    ];
    const findings = analyzeDocumentation(lines, [makeFn('processData', 2)], 'typescript');
    expect(findings.filter(f => f.message.includes("'processData'"))).toHaveLength(0);
  });

  it('does not flag private functions in Python', () => {
    const lines = [
      'def _helper(x):',
      '    return x + 1',
    ];
    const findings = analyzeDocumentation(lines, [makeFn('_helper', 1)], 'python');
    expect(findings.filter(f => f.message.includes("'_helper'"))).toHaveLength(0);
  });

  it('flags low comment-to-code ratio', () => {
    const lines = Array.from({ length: 60 }, () => 'const x = 1;');
    const findings = analyzeDocumentation(lines, [], 'typescript');
    expect(findings.some(f => f.message.includes('comment-to-code ratio'))).toBe(true);
  });

  it('does not flag files with adequate comments', () => {
    const lines = [
      ...Array.from({ length: 50 }, () => 'const x = 1;'),
      ...Array.from({ length: 10 }, () => '// This is a comment'),
    ];
    const findings = analyzeDocumentation(lines, [], 'typescript');
    expect(findings.filter(f => f.message.includes('comment-to-code ratio'))).toHaveLength(0);
  });
});
