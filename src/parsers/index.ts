import type { FunctionInfo } from '../types.js';
import type { SupportedLanguage } from '../utils/language-detect.js';

/**
 * Regex-based function extraction (Tier 2/3 fallback).
 * Tree-sitter AST-based extraction will be added for Tier 1 languages.
 */
export function extractFunctionsRegex(lines: string[], language: SupportedLanguage): FunctionInfo[] {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return extractJSTSFunctions(lines);
    case 'python':
      return extractPythonFunctions(lines);
    case 'go':
      return extractGoFunctions(lines);
    case 'rust':
      return extractRustFunctions(lines);
    case 'java':
    case 'csharp':
    case 'kotlin':
      return extractCStyleFunctions(lines);
    default:
      return extractCStyleFunctions(lines);
  }
}

function extractJSTSFunctions(lines: string[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const patterns = [
    // function declaration
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    // arrow function assigned to const/let/var (must be at statement level)
    /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*\w+)?\s*=>/,
    // method in class/object (must start with indentation + identifier)
    /^\s+(?:async\s+)?([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/,
  ];

  const SKIP_NAMES = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'else', 'return',
    'map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every',
    'then', 'catch', 'finally', 'setTimeout', 'setInterval',
    'require', 'import', 'console', 'log', 'warn', 'error',
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1];
        if (SKIP_NAMES.has(name)) continue;
        const params = match[2]?.trim();
        const paramCount = params ? params.split(',').filter(p => p.trim()).length : 0;
        const endLine = findClosingBrace(lines, i);

        functions.push({
          name,
          startLine: i + 1,
          endLine: endLine + 1,
          parameterCount: paramCount,
          bodyLines: endLine - i,
          nestingDepth: 0,
          cyclomaticComplexity: 1,
        });
        break;
      }
    }
  }

  return functions;
}

function extractPythonFunctions(lines: string[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const pattern = /^(\s*)def\s+(\w+)\s*\(([^)]*)\)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (match) {
      const indent = match[1].length;
      const name = match[2];
      const params = match[3].trim();
      const paramCount = params
        ? params.split(',').filter(p => p.trim() && !p.trim().startsWith('self') && !p.trim().startsWith('cls')).length
        : 0;

      // Find end by indentation
      let endLine = i;
      for (let j = i + 1; j < lines.length; j++) {
        const trimmed = lines[j].trim();
        if (trimmed === '') continue;
        const currentIndent = lines[j].length - lines[j].trimStart().length;
        if (currentIndent <= indent) break;
        endLine = j;
      }

      functions.push({
        name,
        startLine: i + 1,
        endLine: endLine + 1,
        parameterCount: paramCount,
        bodyLines: endLine - i,
        nestingDepth: 0,
        cyclomaticComplexity: 1,
      });
    }
  }

  return functions;
}

function extractGoFunctions(lines: string[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const pattern = /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(([^)]*)\)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (match) {
      const name = match[1];
      const params = match[2].trim();
      const paramCount = params ? params.split(',').filter(p => p.trim()).length : 0;
      const endLine = findClosingBrace(lines, i);

      functions.push({
        name,
        startLine: i + 1,
        endLine: endLine + 1,
        parameterCount: paramCount,
        bodyLines: endLine - i,
        nestingDepth: 0,
        cyclomaticComplexity: 1,
      });
    }
  }

  return functions;
}

function extractRustFunctions(lines: string[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const pattern = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (match) {
      const name = match[1];
      const params = match[2].trim();
      const paramCount = params
        ? params.split(',').filter(p => p.trim() && !p.trim().startsWith('&self') && !p.trim().startsWith('self')).length
        : 0;
      const endLine = findClosingBrace(lines, i);

      functions.push({
        name,
        startLine: i + 1,
        endLine: endLine + 1,
        parameterCount: paramCount,
        bodyLines: endLine - i,
        nestingDepth: 0,
        cyclomaticComplexity: 1,
      });
    }
  }

  return functions;
}

function extractCStyleFunctions(lines: string[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  // Generic C-style: return_type name(params) {
  const pattern = /(?:public|private|protected|static|async|override|virtual|\w+)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+\w+\s*)?\{?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip class/interface/struct declarations
    if (/\b(class|interface|struct|enum|namespace)\b/.test(trimmed)) continue;

    const match = trimmed.match(pattern);
    if (match) {
      const name = match[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'else'].includes(name)) continue;

      const params = match[2].trim();
      const paramCount = params ? params.split(',').filter(p => p.trim()).length : 0;
      const endLine = findClosingBrace(lines, i);

      functions.push({
        name,
        startLine: i + 1,
        endLine: endLine + 1,
        parameterCount: paramCount,
        bodyLines: endLine - i,
        nestingDepth: 0,
        cyclomaticComplexity: 1,
      });
    }
  }

  return functions;
}

function findClosingBrace(lines: string[], startLine: number): number {
  let depth = 0;
  let foundOpen = false;

  for (let i = startLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') {
        depth++;
        foundOpen = true;
      } else if (ch === '}') {
        depth--;
        if (foundOpen && depth === 0) return i;
      }
    }
  }

  // If no braces found, estimate ~20 lines or to end
  return Math.min(startLine + 20, lines.length - 1);
}
