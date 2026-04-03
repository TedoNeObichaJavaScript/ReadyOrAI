import { describe, it, expect } from 'vitest';
import { analyzeImports } from '../../../src/analyzers/imports.js';

describe('imports analyzer', () => {
  it('detects unused named imports in TS', () => {
    const lines = [
      "import { useState, useEffect } from 'react';",
      'const [count, setCount] = useState(0);',
    ];
    const findings = analyzeImports(lines, 'typescript');
    expect(findings.some(f => f.message.includes("'useEffect'") && f.message.includes('unused'))).toBe(true);
    expect(findings.some(f => f.message.includes("'useState'") && f.message.includes('unused'))).toBe(false);
  });

  it('detects wildcard imports', () => {
    const lines = [
      "import * as utils from './utils';",
      'utils.doSomething();',
    ];
    const findings = analyzeImports(lines, 'typescript');
    expect(findings.some(f => f.message.includes('Wildcard import'))).toBe(true);
  });

  it('detects Python star imports', () => {
    const lines = [
      'from os.path import *',
      'print(join("a", "b"))',
    ];
    const findings = analyzeImports(lines, 'python');
    expect(findings.some(f => f.message.includes('Wildcard import'))).toBe(true);
  });

  it('uses word boundaries (no false positives for substrings)', () => {
    const lines = [
      "import { map } from './utils';",
      'const mapping = createMapping();',
    ];
    const findings = analyzeImports(lines, 'typescript');
    // 'map' should be flagged as unused since 'mapping' is not 'map'
    expect(findings.some(f => f.message.includes("'map'") && f.message.includes('unused'))).toBe(true);
  });

  it('does not flag used imports', () => {
    const lines = [
      "import { map } from './utils';",
      'const result = map(items);',
    ];
    const findings = analyzeImports(lines, 'typescript');
    expect(findings.filter(f => f.message.includes("'map'") && f.message.includes('unused'))).toHaveLength(0);
  });

  it('handles aliased imports', () => {
    const lines = [
      "import { foo as bar } from './utils';",
      'const x = bar();',
    ];
    const findings = analyzeImports(lines, 'typescript');
    expect(findings.filter(f => f.message.includes('unused'))).toHaveLength(0);
  });
});
