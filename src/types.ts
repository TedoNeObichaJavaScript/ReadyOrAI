export type Severity = 'info' | 'warning' | 'error';

export type CheckName =
  | 'complexity'
  | 'naming'
  | 'structure'
  | 'patterns'
  | 'imports'
  | 'documentation'
  | 'security'
  | 'duplication';

export interface Finding {
  check: CheckName;
  severity: Severity;
  message: string;
  line?: number;
  endLine?: number;
  column?: number;
  suggestion?: string;
}

export interface FileAnalysis {
  filePath: string;
  language: string;
  metrics: FileMetrics;
  findings: Finding[];
  analyzedAt: string;
}

export interface FileMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  functionCount: number;
  maxNestingDepth: number;
  maxCyclomaticComplexity: number;
  averageFunctionLength: number;
}

export interface DirectoryAnalysis {
  directoryPath: string;
  filesAnalyzed: number;
  totalFindings: number;
  findingsBySeverity: Record<Severity, number>;
  findingsByCheck: Record<string, number>;
  files: FileAnalysis[];
  analyzedAt: string;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameterCount: number;
  bodyLines: number;
  nestingDepth: number;
  cyclomaticComplexity: number;
}

export interface AnalyzerOptions {
  checks: CheckName[];
  severityThreshold: Severity;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

export const DEFAULT_THRESHOLDS = {
  maxFileLines: 300,
  maxFileLinesError: 500,
  maxFunctionLines: 50,
  maxFunctionLinesError: 100,
  maxParameters: 4,
  maxParametersError: 7,
  maxCyclomaticComplexity: 10,
  maxCyclomaticComplexityError: 20,
  maxNestingDepth: 4,
  maxNestingDepthError: 6,
  minCommentRatio: 0.05,
  maxLineLengthWarning: 120,
  maxLineLengthError: 200,
} as const;
