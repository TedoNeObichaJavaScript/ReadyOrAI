import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { analyzeFile, analyzeDirectory } from './analyzers/index.js';
import { readSourceFile } from './utils/file-reader.js';
import { detectLanguage } from './utils/language-detect.js';
import { computeFileMetrics } from './utils/metrics.js';
import { extractFunctionsRegex } from './parsers/index.js';
import { formatFileAnalysis, formatDirectoryAnalysis, formatMetricsOnly } from './formatters/mcp.js';
import type { CheckName } from './types.js';

const CHECK_VALUES = ['all', 'complexity', 'naming', 'structure', 'patterns', 'imports', 'documentation', 'security', 'duplication'] as const;

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'readyorai',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  // ── Tool: inspect_file ──────────────────────────────────────────────
  server.registerTool(
    'inspect_file',
    {
      title: 'Inspect File',
      description: 'Perform zero-cost local static analysis on a source file. Returns structured findings about code quality, complexity, naming, security, and best practices without modifying the file.',
      inputSchema: {
        path: z.string().describe('Absolute or relative path to the file to inspect'),
        checks: z.array(z.enum(CHECK_VALUES)).optional().describe('Specific checks to run. Defaults to all.'),
        severity_threshold: z.enum(['info', 'warning', 'error']).optional().describe('Minimum severity to report. Defaults to info.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ path, checks, severity_threshold }) => {
      try {
        const resolvedChecks = checks?.includes('all') || !checks
          ? undefined
          : (checks.filter(c => c !== 'all') as CheckName[]);

        const analysis = await analyzeFile(path, {
          checks: resolvedChecks ?? ['complexity', 'naming', 'structure', 'patterns', 'imports', 'documentation', 'security', 'duplication'],
          severityThreshold: severity_threshold ?? 'info',
        });

        return {
          content: [{ type: 'text' as const, text: formatFileAnalysis(analysis) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: inspect_directory ─────────────────────────────────────────
  server.registerTool(
    'inspect_directory',
    {
      title: 'Inspect Directory',
      description: 'Analyze all source files in a directory. Returns aggregated metrics and per-file findings.',
      inputSchema: {
        path: z.string().describe('Path to the directory'),
        pattern: z.string().optional().describe('Glob pattern to filter files (e.g., "**/*.ts")'),
        max_files: z.number().optional().describe('Maximum files to analyze. Defaults to 50.'),
        checks: z.array(z.enum(CHECK_VALUES)).optional().describe('Specific checks to run. Defaults to all.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ path, pattern, max_files, checks }) => {
      try {
        const resolvedChecks = checks?.includes('all') || !checks
          ? undefined
          : (checks.filter(c => c !== 'all') as CheckName[]);

        const analysis = await analyzeDirectory(
          path,
          pattern,
          max_files ?? 50,
          resolvedChecks ? { checks: resolvedChecks, severityThreshold: 'info' } : undefined,
        );

        return {
          content: [{ type: 'text' as const, text: formatDirectoryAnalysis(analysis) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_metrics ───────────────────────────────────────────────
  server.registerTool(
    'get_metrics',
    {
      title: 'Get Code Metrics',
      description: 'Calculate quantitative metrics for a file: lines of code, cyclomatic complexity, function count, nesting depth, etc.',
      inputSchema: {
        path: z.string().describe('Path to the file'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ path }) => {
      try {
        const file = await readSourceFile(path);
        const language = detectLanguage(path, file.lines[0]);
        const functions = extractFunctionsRegex(file.lines, language);
        const metrics = computeFileMetrics(file.lines, functions);

        return {
          content: [{ type: 'text' as const, text: formatMetricsOnly(metrics, path) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ── Resource: config ────────────────────────────────────────────────
  server.registerResource(
    'analysis-config',
    'readyorai://config',
    {
      title: 'Analysis Configuration',
      description: 'Current ReadyOrAI analysis configuration and available checks',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          checks: ['complexity', 'naming', 'structure', 'patterns', 'imports', 'documentation', 'security', 'duplication'],
          severityLevels: ['info', 'warning', 'error'],
          supportedLanguages: {
            tier1: ['javascript', 'typescript', 'python', 'go', 'rust'],
            tier2: ['java', 'csharp', 'ruby', 'php', 'swift', 'kotlin', 'c', 'cpp'],
            tier3: ['any file (text-only checks)'],
          },
          thresholds: {
            maxFileLines: 300,
            maxFunctionLines: 50,
            maxParameters: 4,
            maxCyclomaticComplexity: 10,
            maxNestingDepth: 4,
          },
        }, null, 2),
      }],
    }),
  );

  // ── Prompt: review-code ─────────────────────────────────────────────
  server.registerPrompt(
    'review-code',
    {
      title: 'Code Review',
      description: 'Review a file for clean code, best practices, and potential issues',
      argsSchema: {
        path: z.string().describe('Path to the file to review'),
        focus: z.enum(['general', 'security', 'performance', 'readability', 'maintainability']).optional().describe('Review focus area'),
      },
    },
    ({ path, focus }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please review the file at ${path}. Use the inspect_file tool to analyze it, then provide a comprehensive code review${focus ? ` focusing on ${focus}` : ''}. Do not suggest changes to function signatures or behavior — focus on code quality, naming, structure, and best practices.`,
        },
      }],
    }),
  );

  // ── Prompt: health-check ────────────────────────────────────────────
  server.registerPrompt(
    'health-check',
    {
      title: 'Project Health Check',
      description: 'Assess overall code health of a project directory',
      argsSchema: {
        path: z.string().describe('Path to the project root'),
      },
    },
    ({ path }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Run a health check on the project at ${path}. Use inspect_directory to analyze the codebase, then summarize the overall code quality, identify the most critical issues, and suggest a prioritized improvement plan.`,
        },
      }],
    }),
  );

  return server;
}
