import { describe, it, expect } from 'vitest';
import { analyzeSecurity } from '../../../src/analyzers/security.js';

describe('security analyzer', () => {
  it('detects hardcoded API keys', () => {
    const lines = ['const apiKey = "sk-1234567890abcdef1234567890abcdef1234567890abcdef12";'];
    const findings = analyzeSecurity(lines);
    expect(findings.some(f => f.severity === 'error' && f.message.includes('API key'))).toBe(true);
  });

  it('detects eval usage', () => {
    const lines = ['const result = eval("2 + 2");'];
    const findings = analyzeSecurity(lines);
    expect(findings.some(f => f.message.includes('eval()'))).toBe(true);
  });

  it('detects SQL injection patterns', () => {
    const lines = ['const query = "SELECT * FROM users WHERE name = \'" + username + "\'";'];
    const findings = analyzeSecurity(lines);
    expect(findings.some(f => f.message.includes('SQL injection'))).toBe(true);
  });

  it('detects innerHTML assignment', () => {
    const lines = ['element.innerHTML = userInput;'];
    const findings = analyzeSecurity(lines);
    expect(findings.some(f => f.message.includes('innerHTML'))).toBe(true);
  });

  it('returns no findings for clean code', () => {
    const lines = [
      'const name = "Alice";',
      'const age = 30;',
      'console.log(name);',
    ];
    const findings = analyzeSecurity(lines);
    expect(findings).toHaveLength(0);
  });
});
