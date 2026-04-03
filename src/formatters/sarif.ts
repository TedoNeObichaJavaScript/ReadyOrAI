import type { FileAnalysis, DirectoryAnalysis, Finding } from '../types.js';

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations?: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number };
    };
  }>;
  fixes?: Array<{
    description: { text: string };
  }>;
}

interface SarifLog {
  version: '2.1.0';
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          shortDescription: { text: string };
        }>;
      };
    };
    results: SarifResult[];
  }>;
}

const SEVERITY_TO_LEVEL: Record<string, 'error' | 'warning' | 'note'> = {
  error: 'error',
  warning: 'warning',
  info: 'note',
};

function findingToResult(finding: Finding, filePath: string): SarifResult {
  const result: SarifResult = {
    ruleId: `readyorai/${finding.check}`,
    level: SEVERITY_TO_LEVEL[finding.severity] ?? 'note',
    message: { text: finding.message },
  };

  if (finding.line) {
    result.locations = [{
      physicalLocation: {
        artifactLocation: { uri: filePath },
        region: { startLine: finding.line },
      },
    }];
  }

  if (finding.suggestion) {
    result.fixes = [{ description: { text: finding.suggestion } }];
  }

  return result;
}

const RULES = [
  { id: 'readyorai/structure', shortDescription: { text: 'Code structure and size checks' } },
  { id: 'readyorai/naming', shortDescription: { text: 'Naming convention checks' } },
  { id: 'readyorai/complexity', shortDescription: { text: 'Cyclomatic complexity and nesting depth' } },
  { id: 'readyorai/patterns', shortDescription: { text: 'Anti-pattern and code smell detection' } },
  { id: 'readyorai/documentation', shortDescription: { text: 'Documentation and comment coverage' } },
  { id: 'readyorai/security', shortDescription: { text: 'Security vulnerability patterns' } },
  { id: 'readyorai/imports', shortDescription: { text: 'Import organization and usage' } },
  { id: 'readyorai/duplication', shortDescription: { text: 'Code duplication detection' } },
];

function createSarifLog(results: SarifResult[]): SarifLog {
  return {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'ReadyOrAI',
          version: '0.1.0',
          informationUri: 'https://github.com/AlexxCraft/ReadyOrAI',
          rules: RULES,
        },
      },
      results,
    }],
  };
}

export function formatFileSarif(analysis: FileAnalysis): string {
  const results = analysis.findings.map(f => findingToResult(f, analysis.filePath));
  return JSON.stringify(createSarifLog(results), null, 2);
}

export function formatDirectorySarif(analysis: DirectoryAnalysis): string {
  const results: SarifResult[] = [];
  for (const file of analysis.files) {
    for (const finding of file.findings) {
      results.push(findingToResult(finding, file.filePath));
    }
  }
  return JSON.stringify(createSarifLog(results), null, 2);
}
