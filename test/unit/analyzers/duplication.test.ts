import { describe, it, expect } from 'vitest';
import { analyzeDuplication } from '../../../src/analyzers/duplication.js';

describe('duplication analyzer', () => {
  it('detects duplicate code blocks', () => {
    const block = [
      'const a = getValue();',
      'const b = transform(a);',
      'const c = validate(b);',
      'if (c.isValid) {',
      '  processResult(c);',
      '  logSuccess(c);',
      '  saveToDatabase(c);',
      '  notifyUser(c);',
    ];
    const lines = [...block, '', ...block];
    const findings = analyzeDuplication(lines);
    expect(findings.some(f => f.message.includes('Duplicate code block'))).toBe(true);
  });

  it('detects repeated magic strings', () => {
    const lines = [
      'const a = "application/json";',
      'const b = "application/json";',
      'const c = "application/json";',
    ];
    const findings = analyzeDuplication(lines);
    expect(findings.some(f => f.message.includes('application/json') && f.message.includes('repeated'))).toBe(true);
  });

  it('does not flag import paths as magic strings', () => {
    const lines = [
      'const a = "./utils/helper";',
      'const b = "./utils/helper";',
      'const c = "./utils/helper";',
    ];
    const findings = analyzeDuplication(lines);
    expect(findings.filter(f => f.message.includes('repeated'))).toHaveLength(0);
  });

  it('returns no findings for unique code', () => {
    const lines = [
      'const a = 1;',
      'const b = "hello";',
      'const c = true;',
      'function doSomething() { return a + b; }',
    ];
    const findings = analyzeDuplication(lines);
    expect(findings).toHaveLength(0);
  });
});
