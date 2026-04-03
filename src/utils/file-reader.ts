import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { isBinaryExtension } from './language-detect.js';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export interface FileContent {
  content: string;
  lines: string[];
  size: number;
}

export async function readSourceFile(filePath: string): Promise<FileContent> {
  const resolved = path.resolve(filePath);

  const stat = await fs.stat(resolved);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${resolved}`);
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(stat.size / 1024).toFixed(0)}KB > 1MB limit): ${resolved}`);
  }

  if (isBinaryExtension(resolved)) {
    throw new Error(`Binary file not supported: ${resolved}`);
  }

  const content = await fs.readFile(resolved, 'utf-8');
  const lines = content.split(/\r?\n/);

  return { content, lines, size: stat.size };
}

export async function listSourceFiles(
  dirPath: string,
  pattern?: string,
  maxFiles: number = 50,
): Promise<string[]> {
  const { glob } = await import('glob');
  const resolved = path.resolve(dirPath);

  const globPattern = pattern || '**/*.{js,jsx,ts,tsx,py,go,rs,java,cs,rb,php,swift,kt,c,cpp,cc,h,hpp}';

  const files = await glob(globPattern, {
    cwd: resolved,
    absolute: true,
    nodir: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/vendor/**',
      '**/__pycache__/**',
      '**/target/**',
    ],
  });

  return files.slice(0, maxFiles);
}
