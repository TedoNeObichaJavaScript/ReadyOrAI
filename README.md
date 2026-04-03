# ReadyOrAI

Zero-cost MCP server for local code inspection. Analyzes your code for clean code practices, best practices, and gives actionable recommendations — without modifying your code or making API calls.

## Features

- **8 analyzers**: complexity, naming, structure, patterns, imports, documentation, security, duplication
- **Multi-language**: JS/TS, Python, Go, Rust (deep analysis) + Java, C#, Ruby, PHP, and more (regex-based)
- **Zero-cost**: All analysis runs locally — no API keys, no external calls
- **MCP server**: Works with Claude Desktop, Claude Code, and VS Code via stdio transport
- **CLI tool**: `ready @filename` and `AI` terminal commands for standalone use

## Installation

### As an MCP Server

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "readyorai": {
      "command": "npx",
      "args": ["-y", "readyorai"]
    }
  }
}
```

**Claude Code**:

```bash
claude mcp add readyorai -- npx -y readyorai
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "readyorai": {
      "command": "npx",
      "args": ["-y", "readyorai"]
    }
  }
}
```

### As a CLI Tool

```bash
npm install -g readyorai
```

## CLI Usage

```bash
ready @src/index.ts                          # Inspect a single file
ready @src/                                  # Inspect a directory
ready @src/index.ts --checks security,naming # Run specific checks
ready @src/index.ts --json                   # JSON output
ready @src/index.ts --severity warning       # Only warnings and errors
AI                                           # Inspect current directory
AI @src/utils.ts                             # Alias with file target
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `inspect_file` | Analyze a single file for code quality issues |
| `inspect_directory` | Batch analysis of all source files in a directory |
| `get_metrics` | Get quantitative metrics (LOC, complexity, function count) |

## MCP Prompts

| Prompt | Description |
|--------|-------------|
| `review-code` | Structured code review with optional focus area |
| `health-check` | Project-level health assessment |

## Checks

| Check | What it detects |
|-------|----------------|
| `complexity` | Cyclomatic/cognitive complexity, deep nesting |
| `naming` | Convention violations, single-letter vars, boolean prefixes |
| `structure` | Long files/functions, too many parameters, long lines |
| `patterns` | console.log, empty catch, magic numbers, nested ternaries, TODOs |
| `imports` | Unused imports, wildcard imports, scattered imports |
| `documentation` | Missing JSDoc/docstrings, low comment ratio |
| `security` | Hardcoded secrets, eval(), SQL injection, XSS patterns |
| `duplication` | Duplicate code blocks, repeated magic strings |

## Language Support

| Tier | Languages | Analysis |
|------|-----------|----------|
| 1 | JavaScript, TypeScript, Python, Go, Rust | Full AST-powered analysis |
| 2 | Java, C#, Ruby, PHP, Swift, Kotlin, C, C++ | Regex + heuristic analysis |
| 3 | Any text file | Line-based checks (length, TODOs, secrets, duplication) |

## Development

```bash
git clone https://github.com/TedoNeObichaJavaScript/ReadyOrAI.git
cd ReadyOrAI
npm install
npm run build
npm test
```

## License

MIT
