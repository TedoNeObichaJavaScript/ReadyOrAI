import { describe, it, expect } from 'vitest';
import { analyzeStructure } from '../../../src/analyzers/structure.js';
import type { FunctionInfo } from '../../../src/types.js';

describe('structure analyzer', () => {
  it('flags files exceeding line limits', () => {
    const lines = Array.from({ length: 350 }, (_, i) => `line ${i}`);
    const findings = analyzeStructure(lines, [], 'test.ts');
    expect(findings.some(f => f.message.includes('350 lines'))).toBe(true);
  });

  it('flags long functions', () => {
    const fn: FunctionInfo = {
      name: 'longFunction',
      startLine: 1,
      endLine: 80,
      parameterCount: 2,
      bodyLines: 75,
      nestingDepth: 2,
      cyclomaticComplexity: 5,
    };
    const findings = analyzeStructure([], [fn], 'test.ts');
    expect(findings.some(f => f.message.includes("'longFunction'") && f.message.includes('75 lines'))).toBe(true);
  });

  it('flags excessive parameters', () => {
    const fn: FunctionInfo = {
      name: 'manyParams',
      startLine: 1,
      endLine: 10,
      parameterCount: 8,
      bodyLines: 9,
      nestingDepth: 1,
      cyclomaticComplexity: 1,
    };
    const findings = analyzeStructure([], [fn], 'test.ts');
    expect(findings.some(f => f.message.includes('8 parameters'))).toBe(true);
  });

  it('returns no findings for clean code', () => {
    const lines = Array.from({ length: 50 }, () => 'const x = 1;');
    const findings = analyzeStructure(lines, [], 'test.ts');
    expect(findings.filter(f => f.check === 'structure' && !f.message.includes('characters'))).toHaveLength(0);
  });
});
