import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'child_process';

interface SchemaQualityResult {
  name: string;
  grade: string;
  score: number;
  issues: { severity: string; message: string; path?: string }[];
}

interface QualityOutput {
  schemas: SchemaQualityResult[];
  worst: { name: string; grade: string; score: number };
}

interface DiffSchemaResult {
  name: string;
  score: number;
  breaking: number;
  warnings: number;
  info: number;
  diffs: { path?: string; severity: string; description: string }[];
}

interface DiffOutput {
  score: number;
  breaking: number;
  warnings: number;
  info: number;
  schemas: DiffSchemaResult[];
}

async function run(): Promise<void> {
  const command    = core.getInput('command', { required: true });
  const file       = core.getInput('file');
  const oldFile    = core.getInput('old-file');
  const newFile    = core.getInput('new-file');
  const minGrade   = core.getInput('min-grade').toUpperCase();
  const schema     = core.getInput('schema');
  const breakingOnly = core.getInput('breaking-only') === 'true';
  const postComment  = core.getInput('post-comment') !== 'false';
  const token        = core.getInput('token');

  if (command !== 'quality' && command !== 'diff') {
    core.setFailed(`Unknown command "${command}". Must be "quality" or "diff".`);
    return;
  }

  // ── build CLI invocation ──────────────────────────────────────────────────
  const parts = ['npx', '-y', 'typemorph-cli@latest', command, '--json'];

  if (command === 'quality') {
    if (!file) { core.setFailed('"file" input is required for the quality command'); return; }
    parts.push(file);
    if (minGrade) parts.push('--min-grade', minGrade);
    if (schema)   parts.push('--schema', schema);
  } else {
    if (!oldFile || !newFile) { core.setFailed('"old-file" and "new-file" inputs are required for the diff command'); return; }
    parts.push(oldFile, newFile);
    if (schema)       parts.push('--schema', schema);
    if (breakingOnly) parts.push('--breaking-only');
  }

  const cmd = parts.join(' ');
  core.info(`Running: ${cmd}`);

  // ── execute ───────────────────────────────────────────────────────────────
  let stdout = '';
  let exitCode = 0;

  try {
    stdout = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e: any) {
    exitCode = e.status ?? 1;
    stdout = e.stdout ?? '';
    if (e.stderr) core.warning(e.stderr);
  }

  let result: QualityOutput | DiffOutput;
  try {
    result = JSON.parse(stdout);
  } catch {
    core.setFailed(`Failed to parse typemorph output:\n${stdout}`);
    return;
  }

  // ── set outputs ───────────────────────────────────────────────────────────
  const passed = exitCode === 0;

  if (command === 'quality') {
    const q = result as QualityOutput;
    core.setOutput('grade', q.worst?.grade ?? '');
    core.setOutput('score', String(q.worst?.score ?? 0));
    core.setOutput('breaking', '0');
  } else {
    const d = result as DiffOutput;
    core.setOutput('grade', '');
    core.setOutput('score', String(d.score ?? 0));
    core.setOutput('breaking', String(d.breaking ?? 0));
  }
  core.setOutput('passed', String(passed));

  // ── PR comment ────────────────────────────────────────────────────────────
  if (postComment && token && github.context.eventName === 'pull_request') {
    try {
      const octokit = github.getOctokit(token);
      const { owner, repo } = github.context.repo;
      const prNumber = github.context.payload.pull_request!.number;

      const body = command === 'quality'
        ? formatQualityComment(result as QualityOutput, passed, { minGrade, schema })
        : formatDiffComment(result as DiffOutput, passed, { schema });

      const { data: comments } = await octokit.rest.issues.listComments({ owner, repo, issue_number: prNumber });
      const existing = comments.find(c => c.body?.includes('<!-- typemorph-action -->'));

      if (existing) {
        await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
      } else {
        await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
      }
      core.info('PR comment posted');
    } catch (e: any) {
      core.warning(`Failed to post PR comment: ${e.message}`);
    }
  }

  if (!passed) {
    const msg = command === 'quality'
      ? `Quality check failed — worst grade: ${(result as QualityOutput).worst?.grade}`
      : `Breaking changes detected: ${(result as DiffOutput).breaking}`;
    core.setFailed(msg);
  }
}

// ── comment formatters ────────────────────────────────────────────────────────

function gradeEmoji(grade: string): string {
  return grade === 'A' ? '🟢' : grade === 'B' ? '🔵' : grade === 'C' ? '🟡' : '🔴';
}

function formatQualityComment(result: QualityOutput, passed: boolean, opts: { minGrade?: string; schema?: string }): string {
  const icon = passed ? '✅' : '❌';
  const schemas = result.schemas ?? [];
  const lines: string[] = [
    '<!-- typemorph-action -->',
    `## ${icon} TypeMorph — Schema Quality Check`,
    '',
    '| Schema | Grade | Score | Top Issue |',
    '|--------|-------|-------|-----------|',
  ];

  for (const s of schemas) {
    const topIssue = s.issues?.[0]?.message ?? '—';
    lines.push(`| **${s.name}** | ${gradeEmoji(s.grade)} ${s.grade} | ${s.score}/100 | ${topIssue} |`);
  }

  if (opts.minGrade && !passed && result.worst) {
    lines.push('');
    lines.push(`> ❌ Minimum grade **${opts.minGrade}** required. Worst schema: **${result.worst.name}** (Grade **${result.worst.grade}**, ${result.worst.score}/100)`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*[TypeMorph](https://typemorph.dev) · [typemorph-cli](https://www.npmjs.com/package/typemorph-cli)*');
  return lines.join('\n');
}

function formatDiffComment(result: DiffOutput, passed: boolean, opts: { schema?: string }): string {
  const icon = passed ? '✅' : '❌';
  const schemas = result.schemas ?? [];
  const lines: string[] = [
    '<!-- typemorph-action -->',
    `## ${icon} TypeMorph — Breaking Change Detector`,
    '',
    `**Compatibility Score: ${result.score}/100**`,
    '',
    '| Schema | Status | Breaking | Warnings |',
    '|--------|--------|---------|---------|',
  ];

  for (const s of schemas) {
    const status = s.breaking > 0 ? '❌ Breaking' : s.warnings > 0 ? '⚠️ Warnings' : '✅ Clean';
    lines.push(`| **${s.name}** | ${status} | ${s.breaking} | ${s.warnings} |`);
  }

  const breakingDiffs = schemas.flatMap(s =>
    s.diffs
      .filter(d => d.severity === 'error')
      .map(d => `- **${s.name}** \`${d.path ?? ''}\`: ${d.description}`)
  );

  if (breakingDiffs.length > 0) {
    lines.push('');
    lines.push('**Breaking Changes:**');
    lines.push(...breakingDiffs);
  }

  lines.push('');
  lines.push('---');
  lines.push('*[TypeMorph](https://typemorph.dev) · [typemorph-cli](https://www.npmjs.com/package/typemorph-cli)*');
  return lines.join('\n');
}

run().catch(e => core.setFailed(e.message));
