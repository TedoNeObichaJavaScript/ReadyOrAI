import type { Finding } from '../types.js';

const MIN_DUPLICATE_LINES = 8;
const MIN_TOKEN_LENGTH = 80;

export function analyzeDuplication(lines: string[]): Finding[] {
  const findings: Finding[] = [];

  // Token-sequence hashing for near-duplicate block detection
  const blocks = extractNormalizedBlocks(lines, MIN_DUPLICATE_LINES);
  const seen = new Map<string, number>(); // hash -> first occurrence line

  for (const block of blocks) {
    if (seen.has(block.hash)) {
      const firstLine = seen.get(block.hash)!;
      findings.push({
        check: 'duplication',
        severity: 'warning',
        message: `Duplicate code block (lines ${block.startLine}-${block.endLine}) matches lines ${firstLine}-${firstLine + MIN_DUPLICATE_LINES - 1}`,
        line: block.startLine,
        suggestion: 'Extract duplicated logic into a shared function',
      });
    } else {
      seen.set(block.hash, block.startLine);
    }
  }

  // Repeated magic strings
  const stringOccurrences = new Map<string, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(/(['"`])([^'"`]{4,})(\1)/g);
    if (matches) {
      for (const m of matches) {
        const str = m.slice(1, -1);
        // Skip import paths, URLs, common strings
        if (str.startsWith('.') || str.startsWith('/') || str.startsWith('http')) continue;
        if (!stringOccurrences.has(str)) stringOccurrences.set(str, []);
        stringOccurrences.get(str)!.push(i + 1);
      }
    }
  }

  for (const [str, occurrences] of stringOccurrences) {
    if (occurrences.length >= 3) {
      findings.push({
        check: 'duplication',
        severity: 'info',
        message: `String "${str.length > 30 ? str.slice(0, 30) + '...' : str}" repeated ${occurrences.length} times (lines ${occurrences.slice(0, 3).join(', ')}${occurrences.length > 3 ? '...' : ''})`,
        line: occurrences[0],
        suggestion: 'Extract to a named constant',
      });
    }
  }

  return findings;
}

interface Block {
  hash: string;
  startLine: number;
  endLine: number;
}

function extractNormalizedBlocks(lines: string[], windowSize: number): Block[] {
  const blocks: Block[] = [];

  for (let i = 0; i <= lines.length - windowSize; i++) {
    const window = lines.slice(i, i + windowSize);
    const normalized = window
      .map(l => l.trim())
      .filter(l => l !== '' && !l.startsWith('//') && !l.startsWith('#') && !l.startsWith('*'))
      .join('\n');

    if (normalized.length < MIN_TOKEN_LENGTH) continue;

    blocks.push({
      hash: simpleHash(normalized),
      startLine: i + 1,
      endLine: i + windowSize,
    });
  }

  return blocks;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  return hash.toString(36);
}
