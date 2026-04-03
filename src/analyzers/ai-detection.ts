import type { Finding, FunctionInfo } from '../types.js';

interface Signal {
  name: string;
  weight: number;
  hits: number;
  examples: string[];
}

export function analyzeAIGenerated(lines: string[], functions: FunctionInfo[]): Finding[] {
  const signals: Signal[] = [];
  const content = lines.join('\n');

  // 1. Comments that restate the code ("// set x to 5" above "x = 5")
  const restatingComments = detectRestatingComments(lines);
  if (restatingComments.count > 0) {
    signals.push({
      name: 'Restating comments',
      weight: 3,
      hits: restatingComments.count,
      examples: restatingComments.examples,
    });
  }

  // 2. Overly uniform documentation — every function has a doc comment (even trivial ones)
  if (functions.length >= 3) {
    const docCount = countDocumentedFunctions(lines, functions);
    if (docCount === functions.length) {
      signals.push({
        name: 'Every function documented (including trivial ones)',
        weight: 2,
        hits: 1,
        examples: ['100% doc coverage is unusual in human-written code'],
      });
    }
  }

  // 3. "This function/method..." style comments
  const thisPattern = /\/\/\s*This (?:function|method|class|variable|constant|module|hook|component)\b/gi;
  const thisMatches = findPatternLines(lines, thisPattern);
  if (thisMatches.length >= 2) {
    signals.push({
      name: '"This function/method..." comment style',
      weight: 3,
      hits: thisMatches.length,
      examples: thisMatches.slice(0, 3).map(m => `Line ${m.line}: ${m.text.trim()}`),
    });
  }

  // 4. Explanatory section comments ("// --- Section Name ---" or "// ── Section ──")
  const sectionComments = lines.filter(l =>
    /\/\/\s*[-─═]{3,}/.test(l) || /\/\/\s*#{2,}/.test(l) || /\/\*\*?\s*[-─═]{3,}/.test(l)
  ).length;
  if (sectionComments >= 4) {
    signals.push({
      name: 'Heavy section comment dividers',
      weight: 1,
      hits: sectionComments,
      examples: [`${sectionComments} section divider comments`],
    });
  }

  // 5. Repetitive error handling patterns (same catch block repeated)
  const catchBlocks = extractCatchBlocks(lines);
  if (catchBlocks.duplicateCount >= 3) {
    signals.push({
      name: 'Copy-paste error handling',
      weight: 2,
      hits: catchBlocks.duplicateCount,
      examples: [`${catchBlocks.duplicateCount} identical catch blocks`],
    });
  }

  // 6. Overly descriptive variable names (camelCase with 4+ words)
  const verboseVars = findPatternLines(lines, /\b(?:const|let|var)\s+([a-z][a-zA-Z]*(?:[A-Z][a-z]+){3,})\b/g);
  if (verboseVars.length >= 3) {
    signals.push({
      name: 'Overly verbose variable names',
      weight: 2,
      hits: verboseVars.length,
      examples: verboseVars.slice(0, 3).map(m => `Line ${m.line}: ${m.match}`),
    });
  }

  // 7. Uniform function structure (same length ± 5 lines)
  if (functions.length >= 4) {
    const lengths = functions.map(f => f.bodyLines);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const allSimilar = lengths.every(l => Math.abs(l - avg) <= 5);
    if (allSimilar && avg > 5) {
      signals.push({
        name: 'Suspiciously uniform function lengths',
        weight: 2,
        hits: 1,
        examples: [`${functions.length} functions all ~${Math.round(avg)} lines`],
      });
    }
  }

  // 8. AI marker phrases in comments
  const aiPhrases = /\b(?:as (?:an|a) (?:AI|language model)|I'll|Let me|Here(?:'s| is)|Note that|It'?s worth noting|Remember to|Make sure to|Don't forget to|feel free to)\b/gi;
  const aiPhraseMatches = findPatternLines(lines, aiPhrases);
  if (aiPhraseMatches.length >= 1) {
    signals.push({
      name: 'AI-typical phrases in comments',
      weight: 4,
      hits: aiPhraseMatches.length,
      examples: aiPhraseMatches.slice(0, 3).map(m => `Line ${m.line}: ${m.text.trim()}`),
    });
  }

  // 9. Excessive inline explanations (comments on >40% of code lines)
  const codeLines = lines.filter(l => l.trim() !== '' && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && !l.trim().startsWith('*'));
  const inlineCommentLines = codeLines.filter(l => /\S.*\/\/\s*\w/.test(l)).length;
  if (codeLines.length > 20 && inlineCommentLines / codeLines.length > 0.35) {
    signals.push({
      name: 'Excessive inline comments',
      weight: 2,
      hits: inlineCommentLines,
      examples: [`${((inlineCommentLines / codeLines.length) * 100).toFixed(0)}% of code lines have inline comments`],
    });
  }

  // 10. "Step N:" or numbered instruction comments
  const stepComments = findPatternLines(lines, /\/\/\s*(?:Step \d|First,|Second,|Third,|Finally,|Next,)\b/gi);
  if (stepComments.length >= 3) {
    signals.push({
      name: 'Step-by-step instruction comments',
      weight: 3,
      hits: stepComments.length,
      examples: stepComments.slice(0, 3).map(m => `Line ${m.line}: ${m.text.trim()}`),
    });
  }

  // 11. Co-Authored-By or generated-by markers
  if (/(?:Co-Authored-By|Generated (?:by|with)|AI-generated|ChatGPT|Copilot|Claude)/i.test(content)) {
    signals.push({
      name: 'Explicit AI authorship marker',
      weight: 5,
      hits: 1,
      examples: ['File contains AI generation attribution'],
    });
  }

  // 12. Placeholder/example values that look AI-generated
  const placeholders = findPatternLines(lines, /['"](?:your-?(?:api-?key|token|secret|password)|example\.com|foo|bar|baz|lorem ipsum|John (?:Doe|Smith))['"]/gi);
  if (placeholders.length >= 2) {
    signals.push({
      name: 'AI-typical placeholder values',
      weight: 2,
      hits: placeholders.length,
      examples: placeholders.slice(0, 3).map(m => `Line ${m.line}: ${m.text.trim()}`),
    });
  }

  // Calculate score
  const totalWeight = signals.reduce((sum, s) => sum + s.weight * Math.min(s.hits, 5), 0);
  const maxReasonableWeight = 40;
  const confidence = Math.min(Math.round((totalWeight / maxReasonableWeight) * 100), 99);

  const findings: Finding[] = [];

  if (confidence >= 15) {
    let severity: 'info' | 'warning' | 'error' = 'info';
    if (confidence >= 70) severity = 'warning';
    if (confidence >= 90) severity = 'error';

    findings.push({
      check: 'ai-detection',
      severity,
      message: `AI-generated code confidence: ${confidence}% — ${signals.length} signal${signals.length > 1 ? 's' : ''} detected`,
    });

    for (const signal of signals) {
      findings.push({
        check: 'ai-detection',
        severity: 'info',
        message: `AI signal: ${signal.name} (×${signal.hits})`,
        suggestion: signal.examples[0],
      });
    }
  }

  return findings;
}

function detectRestatingComments(lines: string[]): { count: number; examples: string[] } {
  let count = 0;
  const examples: string[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const comment = lines[i].trim();
    if (!comment.startsWith('//')) continue;

    const commentText = comment.replace(/^\/\/\s*/, '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const nextLine = lines[i + 1].trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');

    if (commentText.length < 5 || nextLine.length < 5) continue;

    // Check if the comment words mostly appear in the next line
    const commentWords = commentText.split(/\s+/).filter(w => w.length > 2);
    if (commentWords.length < 2) continue;
    const matchCount = commentWords.filter(w => nextLine.includes(w)).length;

    if (matchCount / commentWords.length >= 0.6) {
      count++;
      if (examples.length < 3) {
        examples.push(`Line ${i + 1}: "${comment.slice(0, 60)}"`);
      }
    }
  }

  return { count, examples };
}

function countDocumentedFunctions(lines: string[], functions: FunctionInfo[]): number {
  let documented = 0;
  for (const fn of functions) {
    for (let i = fn.startLine - 2; i >= Math.max(0, fn.startLine - 6); i--) {
      const t = lines[i]?.trim() ?? '';
      if (t === '') continue;
      if (t.startsWith('/**') || t.startsWith('///') || t.startsWith('//') || t.startsWith('#') || t.startsWith('"""') || t.startsWith("'''")) {
        documented++;
        break;
      }
      break;
    }
  }
  return documented;
}

interface PatternMatch {
  line: number;
  text: string;
  match: string;
}

function findPatternLines(lines: string[], pattern: RegExp): PatternMatch[] {
  const results: PatternMatch[] = [];
  for (let i = 0; i < lines.length; i++) {
    pattern.lastIndex = 0;
    const m = pattern.exec(lines[i]);
    if (m) {
      results.push({ line: i + 1, text: lines[i], match: m[0] });
    }
  }
  return results;
}

function extractCatchBlocks(lines: string[]): { duplicateCount: number } {
  const blocks: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/\bcatch\b/.test(lines[i])) {
      const block = lines.slice(i, Math.min(i + 5, lines.length)).map(l => l.trim()).join('|');
      blocks.push(block);
    }
  }
  const counts = new Map<string, number>();
  for (const b of blocks) {
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  let duplicateCount = 0;
  for (const c of counts.values()) {
    if (c >= 2) duplicateCount += c;
  }
  return { duplicateCount };
}
