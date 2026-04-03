import type { Finding } from '../types.js';

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/i, label: 'API key' },
  { pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i, label: 'Secret/password' },
  { pattern: /(?:token|auth_token|access_token)\s*[:=]\s*['"][^'"]{8,}['"]/i, label: 'Token' },
  { pattern: /(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/, label: 'AWS access key' },
  { pattern: /ghp_[A-Za-z0-9_]{36}/, label: 'GitHub personal access token' },
  { pattern: /sk-[A-Za-z0-9]{48}/, label: 'OpenAI API key' },
  { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, label: 'Private key' },
];

export function analyzeSecurity(lines: string[]): Finding[] {
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue;

    // Hardcoded secrets
    for (const { pattern, label } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          check: 'security',
          severity: 'error',
          message: `Possible hardcoded ${label} detected`,
          line: lineNum,
          suggestion: 'Move to environment variables or a secrets manager',
        });
        break;
      }
    }

    // eval() usage
    if (/\beval\s*\(/.test(line)) {
      findings.push({
        check: 'security',
        severity: 'error',
        message: 'Use of eval() — potential code injection risk',
        line: lineNum,
        suggestion: 'Avoid eval(); use safer alternatives like JSON.parse() or Function()',
      });
    }

    // exec() in Python context
    if (/\bexec\s*\(/.test(line) && !/\bchild_process\b/.test(line)) {
      findings.push({
        check: 'security',
        severity: 'warning',
        message: 'Use of exec() — potential code injection risk',
        line: lineNum,
        suggestion: 'Avoid dynamic code execution; use safer alternatives',
      });
    }

    // SQL string concatenation
    if (/(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\+\s*\w/.test(line) ||
        /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\$\{/.test(line) ||
        /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*%s/.test(line)) {
      findings.push({
        check: 'security',
        severity: 'error',
        message: 'Possible SQL injection — string concatenation in SQL query',
        line: lineNum,
        suggestion: 'Use parameterized queries or prepared statements',
      });
    }

    // Insecure random
    if (/Math\.random\s*\(\s*\)/.test(line)) {
      // Only flag if near security-related context
      const context = lines.slice(Math.max(0, i - 3), i + 4).join(' ').toLowerCase();
      if (/(?:token|secret|password|hash|key|auth|session|random.*id|uuid)/.test(context)) {
        findings.push({
          check: 'security',
          severity: 'warning',
          message: 'Math.random() used in security-sensitive context',
          line: lineNum,
          suggestion: 'Use crypto.randomUUID() or crypto.getRandomValues() instead',
        });
      }
    }

    // innerHTML assignment (XSS risk)
    if (/\.innerHTML\s*=/.test(line)) {
      findings.push({
        check: 'security',
        severity: 'warning',
        message: 'Direct innerHTML assignment — potential XSS risk',
        line: lineNum,
        suggestion: 'Use textContent, or sanitize HTML before insertion',
      });
    }
  }

  return findings;
}
