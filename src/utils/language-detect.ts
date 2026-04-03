import * as path from 'node:path';

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'c'
  | 'cpp'
  | 'unknown';

export type LanguageTier = 1 | 2 | 3;

const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.pyw': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',
};

const SHEBANG_MAP: Record<string, SupportedLanguage> = {
  node: 'javascript',
  python: 'python',
  python3: 'python',
  ruby: 'ruby',
  php: 'php',
};

const TIER_MAP: Record<SupportedLanguage, LanguageTier> = {
  javascript: 1,
  typescript: 1,
  python: 1,
  go: 1,
  rust: 1,
  java: 2,
  csharp: 2,
  ruby: 2,
  php: 2,
  swift: 2,
  kotlin: 2,
  c: 2,
  cpp: 2,
  unknown: 3,
};

export function detectLanguage(filePath: string, firstLine?: string): SupportedLanguage {
  const ext = path.extname(filePath).toLowerCase();
  if (EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }

  if (firstLine?.startsWith('#!')) {
    for (const [key, lang] of Object.entries(SHEBANG_MAP)) {
      if (firstLine.includes(key)) {
        return lang;
      }
    }
  }

  return 'unknown';
}

export function getLanguageTier(language: SupportedLanguage): LanguageTier {
  return TIER_MAP[language];
}

export function isBinaryExtension(filePath: string): boolean {
  const binaryExts = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.wasm', '.pyc', '.class', '.o', '.obj',
  ]);
  return binaryExts.has(path.extname(filePath).toLowerCase());
}
