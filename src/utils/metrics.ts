import type { FileMetrics, FunctionInfo } from '../types.js';

export function countLines(lines: string[]): Pick<FileMetrics, 'totalLines' | 'codeLines' | 'commentLines' | 'blankLines'> {
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      blankLines++;
      continue;
    }

    if (inBlockComment) {
      commentLines++;
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*')) {
      commentLines++;
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--')) {
      commentLines++;
      continue;
    }

    codeLines++;
  }

  return {
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
  };
}

export function computeFileMetrics(lines: string[], functions: FunctionInfo[]): FileMetrics {
  const lineCounts = countLines(lines);

  const avgFunctionLength = functions.length > 0
    ? functions.reduce((sum, f) => sum + f.bodyLines, 0) / functions.length
    : 0;

  const maxNesting = functions.length > 0
    ? Math.max(...functions.map(f => f.nestingDepth))
    : 0;

  const maxComplexity = functions.length > 0
    ? Math.max(...functions.map(f => f.cyclomaticComplexity))
    : 0;

  return {
    ...lineCounts,
    functionCount: functions.length,
    maxNestingDepth: maxNesting,
    maxCyclomaticComplexity: maxComplexity,
    averageFunctionLength: Math.round(avgFunctionLength * 10) / 10,
  };
}
