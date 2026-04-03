import type { CheckName, FileAnalysis, Finding, FunctionInfo, AnalyzerOptions, Severity, ReadyOrAIConfig } from '../types.js';
import { SEVERITY_ORDER, DEFAULT_THRESHOLDS } from '../types.js';
import { readSourceFile, listSourceFiles } from '../utils/file-reader.js';
import { detectLanguage, getLanguageTier } from '../utils/language-detect.js';
import { computeFileMetrics } from '../utils/metrics.js';
import { analyzeStructure } from './structure.js';
import { analyzeNaming } from './naming.js';
import { analyzeComplexity, estimateCyclomaticComplexity, estimateNestingDepth } from './complexity.js';
import { analyzePatterns } from './patterns.js';
import { analyzeDocumentation } from './documentation.js';
import { analyzeSecurity } from './security.js';
import { analyzeImports } from './imports.js';
import { analyzeDuplication } from './duplication.js';
import { analyzeAIGenerated } from './ai-detection.js';
import { extractFunctionsRegex } from '../parsers/index.js';
import { loadConfig, mergeConfig } from '../utils/config.js';
import type { DirectoryAnalysis } from '../types.js';

const ALL_CHECKS: CheckName[] = [
  'structure', 'naming', 'complexity', 'patterns',
  'documentation', 'security', 'imports', 'duplication', 'ai-detection',
];

export async function analyzeFile(
  filePath: string,
  options?: Partial<AnalyzerOptions>,
): Promise<FileAnalysis> {
  const thresholds = options?.thresholds;
  const rules = options?.rules;
  const rawChecks = options?.checks ?? ALL_CHECKS;
  const checks = rules
    ? rawChecks.filter(c => rules[c]?.enabled !== false)
    : rawChecks;
  const threshold = options?.severityThreshold ?? 'info';

  const file = await readSourceFile(filePath);
  const language = detectLanguage(filePath, file.lines[0]);
  const tier = getLanguageTier(language);

  // Extract function info (regex-based for now; tree-sitter in Phase 2)
  const functions = extractFunctionsRegex(file.lines, language);

  // Enrich functions with complexity estimates
  for (const fn of functions) {
    fn.cyclomaticComplexity = estimateCyclomaticComplexity(file.lines, fn.startLine - 1, fn.endLine - 1);
    fn.nestingDepth = estimateNestingDepth(file.lines, fn.startLine - 1, fn.endLine - 1);
  }

  const metrics = computeFileMetrics(file.lines, functions);
  let findings: Finding[] = [];

  // Run selected analyzers
  if (checks.includes('structure')) {
    findings.push(...analyzeStructure(file.lines, functions, filePath, thresholds));
  }
  if (checks.includes('naming')) {
    findings.push(...analyzeNaming(file.lines, functions, language));
  }
  if (checks.includes('complexity')) {
    findings.push(...analyzeComplexity(functions, thresholds));
  }
  if (checks.includes('patterns')) {
    findings.push(...analyzePatterns(file.lines));
  }
  if (checks.includes('documentation')) {
    findings.push(...analyzeDocumentation(file.lines, functions, language, thresholds));
  }
  if (checks.includes('security')) {
    findings.push(...analyzeSecurity(file.lines));
  }
  if (checks.includes('imports') && tier <= 2) {
    findings.push(...analyzeImports(file.lines, language));
  }
  if (checks.includes('duplication')) {
    findings.push(...analyzeDuplication(file.lines));
  }
  if (checks.includes('ai-detection')) {
    findings.push(...analyzeAIGenerated(file.lines, functions));
  }

  // Filter by severity threshold
  findings = findings.filter(f => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[threshold]);

  // Filter out suppressed findings (readyorai-ignore-next-line / readyorai-ignore)
  findings = filterSuppressed(findings, file.lines);

  // Sort by severity (error first), then by line number
  findings.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return (a.line ?? 0) - (b.line ?? 0);
  });

  return {
    filePath,
    language,
    metrics,
    findings,
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzeDirectory(
  dirPath: string,
  pattern?: string,
  maxFiles: number = 50,
  options?: Partial<AnalyzerOptions>,
): Promise<DirectoryAnalysis> {
  // Load config from target directory and merge with explicit options
  const fileConfig = await loadConfig(dirPath);
  const merged = mergeConfig(fileConfig, options);
  const effectiveOptions: Partial<AnalyzerOptions> = {
    checks: merged.checks ?? options?.checks,
    severityThreshold: merged.severityThreshold ?? options?.severityThreshold ?? 'info',
    thresholds: merged.thresholds,
    rules: merged.rules,
    ignore: merged.ignore,
  };

  const ignorePatterns = effectiveOptions.ignore ?? [];
  const files = await listSourceFiles(dirPath, pattern, maxFiles);
  const results: FileAnalysis[] = [];

  for (const file of files) {
    if (ignorePatterns.some(p => file.includes(p.replace(/\*\*/g, '').replace(/\*/g, '')))) continue;
    try {
      const analysis = await analyzeFile(file, effectiveOptions);
      results.push(analysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        filePath: file,
        language: 'unknown',
        metrics: { totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0, functionCount: 0, maxNestingDepth: 0, maxCyclomaticComplexity: 0, averageFunctionLength: 0 },
        findings: [{
          check: 'structure',
          severity: 'warning',
          message: `Failed to analyze file: ${msg}`,
        }],
        analyzedAt: new Date().toISOString(),
      });
    }
  }

  const allFindings = results.flatMap(r => r.findings);
  const findingsBySeverity: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  const findingsByCheck: Record<string, number> = {};

  for (const f of allFindings) {
    findingsBySeverity[f.severity]++;
    findingsByCheck[f.check] = (findingsByCheck[f.check] || 0) + 1;
  }

  return {
    directoryPath: dirPath,
    filesAnalyzed: results.length,
    totalFindings: allFindings.length,
    findingsBySeverity,
    findingsByCheck,
    files: results,
    analyzedAt: new Date().toISOString(),
  };
}

const SUPPRESS_PATTERN = /readyorai-ignore(?:-next-line)?(?:\s+(\S+))?/;

function filterSuppressed(findings: Finding[], lines: string[]): Finding[] {
  const suppressedLines = new Map<number, string | null>();
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(SUPPRESS_PATTERN);
    if (!match) continue;
    const check = match[1] || null;
    if (/readyorai-ignore-next-line/.test(lines[i])) {
      suppressedLines.set(i + 2, check); // next line (1-indexed)
    } else {
      suppressedLines.set(i + 1, check); // same line (inline)
    }
  }

  return findings.filter(f => {
    if (!f.line) return true;
    const suppression = suppressedLines.get(f.line);
    if (suppression === undefined) return true;
    if (suppression === null) return false;
    return f.check !== suppression;
  });
}
