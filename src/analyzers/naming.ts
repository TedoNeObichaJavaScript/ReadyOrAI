import type { Finding, FunctionInfo } from '../types.js';
import type { SupportedLanguage } from '../utils/language-detect.js';

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;
const UPPER_SNAKE = /^[A-Z][A-Z0-9_]*$/;
const SINGLE_LETTER = /^[a-zA-Z]$/;
const LOOP_ITERATORS = new Set(['i', 'j', 'k', 'x', 'y', 'z', 'n', 'm', '_']);

interface NamingConvention {
  functions: RegExp;
  variables: RegExp;
  constants: RegExp;
  classes: RegExp;
  label: string;
}

const CONVENTIONS: Partial<Record<SupportedLanguage, NamingConvention>> = {
  javascript: { functions: CAMEL_CASE, variables: CAMEL_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'camelCase' },
  typescript: { functions: CAMEL_CASE, variables: CAMEL_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'camelCase' },
  python: { functions: SNAKE_CASE, variables: SNAKE_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'snake_case' },
  go: { functions: PASCAL_CASE, variables: CAMEL_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'PascalCase (exported)' },
  rust: { functions: SNAKE_CASE, variables: SNAKE_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'snake_case' },
  java: { functions: CAMEL_CASE, variables: CAMEL_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'camelCase' },
  csharp: { functions: PASCAL_CASE, variables: CAMEL_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'PascalCase' },
  ruby: { functions: SNAKE_CASE, variables: SNAKE_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'snake_case' },
  kotlin: { functions: CAMEL_CASE, variables: CAMEL_CASE, constants: UPPER_SNAKE, classes: PASCAL_CASE, label: 'camelCase' },
};

export function analyzeNaming(
  lines: string[],
  functions: FunctionInfo[],
  language: SupportedLanguage,
): Finding[] {
  const findings: Finding[] = [];
  const convention = CONVENTIONS[language];

  // Check function names against language convention
  if (convention) {
    for (const fn of functions) {
      if (fn.name.startsWith('_') || fn.name.startsWith('#')) continue; // private convention
      if (!convention.functions.test(fn.name) && !UPPER_SNAKE.test(fn.name)) {
        findings.push({
          check: 'naming',
          severity: 'warning',
          message: `Function '${fn.name}' doesn't follow ${convention.label} convention`,
          line: fn.startLine,
          suggestion: `Rename to follow ${convention.label} naming`,
        });
      }
    }
  }

  // Detect single-letter variables (regex-based, language-agnostic)
  const varPatterns = [
    /\b(?:let|var|const|val)\s+([a-zA-Z])\b/g,         // JS/TS/Kotlin
    /\b([a-zA-Z])\s*(?::=|=)\s/g,                       // Go/Python
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of varPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const name = match[1];
        if (!LOOP_ITERATORS.has(name)) {
          findings.push({
            check: 'naming',
            severity: 'info',
            message: `Single-letter variable '${name}' — consider a descriptive name`,
            line: i + 1,
            suggestion: 'Use a descriptive name that explains the purpose',
          });
        }
      }
    }
  }

  // Detect boolean variables without proper prefix
  const boolPattern = /\b(?:let|var|const|val)\s+(\w+)\s*(?::\s*boolean)?\s*=\s*(?:true|false)\b/g;
  for (let i = 0; i < lines.length; i++) {
    boolPattern.lastIndex = 0;
    let match;
    while ((match = boolPattern.exec(lines[i])) !== null) {
      const name = match[1];
      if (!/^(?:is|has|should|can|will|did|was|are|does|needs|allows|enables)/.test(name)) {
        findings.push({
          check: 'naming',
          severity: 'info',
          message: `Boolean '${name}' lacks conventional prefix (is/has/should/can/...)`,
          line: i + 1,
          suggestion: `Consider renaming to 'is${name.charAt(0).toUpperCase() + name.slice(1)}' or similar`,
        });
      }
    }
  }

  return findings;
}
