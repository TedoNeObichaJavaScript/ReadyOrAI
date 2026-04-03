import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

const CLI = path.resolve('build/cli.js');
const FIXTURES = path.resolve('test/fixtures');

describe('CLI integration', () => {
  it('inspects a single file', () => {
    try {
      execSync(`node ${CLI} @${FIXTURES}/sample-js.js`, { encoding: 'utf-8' });
    } catch (err: any) {
      // Non-zero exit is expected when findings exist
      expect(err.stdout).toContain('sample-js.js');
      expect(err.stdout).toContain('errors');
      return;
    }
    // If no error thrown, the file was clean — still valid
  });

  it('inspects a clean file with fewer issues', () => {
    const output = execSync(`node ${CLI} @${FIXTURES}/sample-clean.ts`, { encoding: 'utf-8' });
    expect(output).toContain('sample-clean.ts');
  });

  it('outputs JSON with --json flag', () => {
    const output = execSync(`node ${CLI} @${FIXTURES}/sample-clean.ts --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed.filePath).toContain('sample-clean.ts');
    expect(parsed.findings).toBeDefined();
  });

  it('shows help with --help', () => {
    const output = execSync(`node ${CLI} --help`, { encoding: 'utf-8' });
    expect(output).toContain('ReadyOrAI');
    expect(output).toContain('Usage');
  });

  it('shows version with --version', () => {
    const output = execSync(`node ${CLI} --version`, { encoding: 'utf-8' });
    expect(output).toContain('0.1.0');
  });
});
