import { describe, it, expect } from 'vitest';
import { analyzePatterns } from '../../../src/analyzers/patterns.js';

describe('patterns analyzer', () => {
  it('detects console.log statements', () => {
    const lines = ['console.log("debug");'];
    const findings = analyzePatterns(lines);
    expect(findings.some(f => f.message.includes('console.log'))).toBe(true);
  });

  it('detects empty catch blocks', () => {
    const lines = ['try { x() } catch (err) {}'];
    const findings = analyzePatterns(lines);
    expect(findings.some(f => f.message.includes('Empty catch'))).toBe(true);
  });

  it('detects nested ternaries', () => {
    const lines = ['const x = a ? b ? c : d : e;'];
    const findings = analyzePatterns(lines);
    expect(findings.some(f => f.message.includes('Nested ternary'))).toBe(true);
  });

  it('detects TODO comments', () => {
    const lines = ['// TODO: fix this later'];
    const findings = analyzePatterns(lines);
    expect(findings.some(f => f.message.includes('TODO'))).toBe(true);
  });

  it('returns no findings for clean code', () => {
    const lines = [
      'const result = computeValue(input);',
      'return result;',
    ];
    const findings = analyzePatterns(lines);
    expect(findings).toHaveLength(0);
  });
});
