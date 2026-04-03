import { describe, it, expect } from 'vitest';
import { analyzeNaming } from '../../../src/analyzers/naming.js';
import type { FunctionInfo } from '../../../src/types.js';

function makeFn(name: string): FunctionInfo {
  return { name, startLine: 1, endLine: 5, parameterCount: 1, bodyLines: 3, nestingDepth: 1, cyclomaticComplexity: 1 };
}

describe('naming analyzer', () => {
  it('flags non-camelCase function names in JS/TS', () => {
    const findings = analyzeNaming([], [makeFn('my_function')], 'typescript');
    expect(findings.some(f => f.message.includes("'my_function'") && f.message.includes('camelCase'))).toBe(true);
  });

  it('flags non-snake_case function names in Python', () => {
    const findings = analyzeNaming([], [makeFn('myFunction')], 'python');
    expect(findings.some(f => f.message.includes("'myFunction'") && f.message.includes('snake_case'))).toBe(true);
  });

  it('allows correct naming conventions', () => {
    const tsFindings = analyzeNaming([], [makeFn('myFunction')], 'typescript');
    expect(tsFindings.filter(f => f.message.includes("'myFunction'"))).toHaveLength(0);

    const pyFindings = analyzeNaming([], [makeFn('my_function')], 'python');
    expect(pyFindings.filter(f => f.message.includes("'my_function'"))).toHaveLength(0);
  });

  it('flags single-letter variables outside loops', () => {
    const lines = ['const q = computeResult();'];
    const findings = analyzeNaming(lines, [], 'typescript');
    expect(findings.some(f => f.message.includes("'q'") && f.message.includes('Single-letter'))).toBe(true);
  });

  it('allows common loop iterators', () => {
    const lines = ['for (let i = 0; i < n; i++) {'];
    const findings = analyzeNaming(lines, [], 'typescript');
    expect(findings.filter(f => f.message.includes("'i'"))).toHaveLength(0);
  });

  it('flags booleans without conventional prefix', () => {
    const lines = ['const active = true;'];
    const findings = analyzeNaming(lines, [], 'typescript');
    expect(findings.some(f => f.message.includes("'active'") && f.message.includes('prefix'))).toBe(true);
  });

  it('allows booleans with conventional prefix', () => {
    const lines = ['const isActive = true;'];
    const findings = analyzeNaming(lines, [], 'typescript');
    expect(findings.filter(f => f.message.includes('prefix'))).toHaveLength(0);
  });
});
