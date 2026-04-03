import { describe, it, expect } from 'vitest';
import { analyzeComplexity, estimateCyclomaticComplexity, estimateNestingDepth } from '../../../src/analyzers/complexity.js';
import type { FunctionInfo } from '../../../src/types.js';

describe('complexity analyzer', () => {
  it('flags high cyclomatic complexity', () => {
    const fn: FunctionInfo = {
      name: 'complexFn',
      startLine: 1,
      endLine: 50,
      parameterCount: 2,
      bodyLines: 48,
      nestingDepth: 3,
      cyclomaticComplexity: 15,
    };
    const findings = analyzeComplexity([fn]);
    expect(findings.some(f => f.message.includes('cyclomatic complexity 15'))).toBe(true);
    expect(findings[0].severity).toBe('warning');
  });

  it('flags error-level cyclomatic complexity', () => {
    const fn: FunctionInfo = {
      name: 'veryComplexFn',
      startLine: 1,
      endLine: 100,
      parameterCount: 2,
      bodyLines: 98,
      nestingDepth: 5,
      cyclomaticComplexity: 25,
    };
    const findings = analyzeComplexity([fn]);
    expect(findings.some(f => f.severity === 'error' && f.message.includes('cyclomatic complexity'))).toBe(true);
  });

  it('flags deep nesting', () => {
    const fn: FunctionInfo = {
      name: 'nestedFn',
      startLine: 1,
      endLine: 20,
      parameterCount: 1,
      bodyLines: 18,
      nestingDepth: 5,
      cyclomaticComplexity: 3,
    };
    const findings = analyzeComplexity([fn]);
    expect(findings.some(f => f.message.includes('nesting depth 5'))).toBe(true);
  });

  it('returns no findings for simple functions', () => {
    const fn: FunctionInfo = {
      name: 'simpleFn',
      startLine: 1,
      endLine: 5,
      parameterCount: 1,
      bodyLines: 3,
      nestingDepth: 1,
      cyclomaticComplexity: 2,
    };
    const findings = analyzeComplexity([fn]);
    expect(findings).toHaveLength(0);
  });

  it('respects threshold overrides', () => {
    const fn: FunctionInfo = {
      name: 'mediumFn',
      startLine: 1,
      endLine: 30,
      parameterCount: 2,
      bodyLines: 28,
      nestingDepth: 3,
      cyclomaticComplexity: 8,
    };
    // Default threshold (10) should not flag complexity 8
    expect(analyzeComplexity([fn])).toHaveLength(0);
    // Override to lower threshold should flag it
    const findings = analyzeComplexity([fn], { maxCyclomaticComplexity: 5 });
    expect(findings.some(f => f.message.includes('cyclomatic complexity'))).toBe(true);
  });
});

describe('estimateCyclomaticComplexity', () => {
  it('counts branches correctly', () => {
    const lines = [
      'function test() {',
      '  if (a) {',
      '    for (let i = 0; i < n; i++) {',
      '      if (b && c) {',
      '        return;',
      '      }',
      '    }',
      '  }',
      '}',
    ];
    const complexity = estimateCyclomaticComplexity(lines, 0, 8);
    // base 1 + if + for + if = 4 (&& is inside "if (b && c)" which counts as one branch keyword match)
    expect(complexity).toBe(4);
  });
});

describe('estimateNestingDepth', () => {
  it('counts brace nesting correctly', () => {
    const lines = [
      'function test() {',
      '  if (a) {',
      '    for (let i = 0; i < n; i++) {',
      '      doSomething();',
      '    }',
      '  }',
      '}',
    ];
    const depth = estimateNestingDepth(lines, 0, 6);
    expect(depth).toBe(3);
  });
});
