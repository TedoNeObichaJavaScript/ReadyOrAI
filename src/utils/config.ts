import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ReadyOrAIConfig } from '../types.js';

const CONFIG_FILENAMES = ['.readyorai.json', '.readyorai.jsonc'];

export async function loadConfig(startDir: string): Promise<ReadyOrAIConfig> {
  let dir = path.resolve(startDir);

  // Walk up to find config file (max 10 levels)
  for (let i = 0; i < 10; i++) {
    for (const name of CONFIG_FILENAMES) {
      const configPath = path.join(dir, name);
      try {
        const raw = await fs.readFile(configPath, 'utf-8');
        // Strip single-line comments for .jsonc support
        const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
        return JSON.parse(stripped) as ReadyOrAIConfig;
      } catch {
        // Not found here, keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return {};
}

export function mergeConfig(
  fileConfig: ReadyOrAIConfig,
  cliOverrides?: Partial<ReadyOrAIConfig>,
): ReadyOrAIConfig {
  return {
    checks: cliOverrides?.checks ?? fileConfig.checks,
    severityThreshold: cliOverrides?.severityThreshold ?? fileConfig.severityThreshold,
    ignore: [...(fileConfig.ignore ?? []), ...(cliOverrides?.ignore ?? [])],
    thresholds: { ...fileConfig.thresholds, ...cliOverrides?.thresholds },
    rules: { ...fileConfig.rules, ...cliOverrides?.rules },
  };
}
