import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import { runEngine, inferSchema, parseYAML } from '../../src/lib/engine';
import { isOpenAPISpec, parseOpenAPIComponents } from '../../src/lib/openapi-parser';
import { isJSONSchema, parseJSONSchema } from '../../src/lib/jsonschema-parser';
import { analyzeQuality } from '../../src/lib/quality';
import { compareSchemaTypes, type SchemaDiff } from '../../src/lib/diff';
import type { Schema } from '../../src/lib/types';

// ── terminal colors ──────────────────────────────────────────────────────────
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow= (s: string) => `\x1b[33m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`;
const blue  = (s: string) => `\x1b[34m${s}\x1b[0m`;

// ── helpers ──────────────────────────────────────────────────────────────────
function readFile(filePath: string): string {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) { console.error(red(`File not found: ${filePath}`)); process.exit(1); }
  return fs.readFileSync(abs, 'utf8');
}

function readStdin(): Promise<string> {
  return new Promise(resolve => {
    let data = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', line => (data += line + '\n'));
    rl.on('close', () => resolve(data.trim()));
  });
}

function parseInput(text: string): { obj: any; raw: string } {
  const trimmed = text.trim();
  try { return { obj: JSON.parse(trimmed), raw: trimmed }; } catch {}
  try { return { obj: parseYAML(trimmed), raw: trimmed }; } catch {}
  console.error(red('typemorph: input is not valid JSON or YAML'));
  process.exit(1);
}

function toSchema(text: string): Schema {
  const { obj } = parseInput(text);
  if (isOpenAPISpec(obj)) {
    const schemas = parseOpenAPIComponents(obj);
    return schemas[0]?.schema ?? inferSchema(obj);
  }
  if (isJSONSchema(obj)) {
    const schemas = parseJSONSchema(obj);
    return schemas[0]?.schema ?? inferSchema(obj);
  }
  return inferSchema(obj);
}

// ── format list ──────────────────────────────────────────────────────────────
const FORMAT_GROUPS: Record<string, string[]> = {
  'TypeScript / Validation': ['typescript', 'zod', 'yup', 'joi', 'valibot'],
  'Backend':                 ['go', 'rust', 'java', 'csharp', 'python', 'swift', 'kotlin', 'php', 'dart'],
  'Database':                ['prisma', 'mysql', 'postgres', 'sqlite', 'mongoose', 'sequelize', 'typeorm', 'drizzle', 'dynamodb', 'bigquery', 'mongodb'],
  'API / Schema':            ['openapi', 'graphql', 'proto', 'jsonschema'],
  'Data / Markup':           ['csv', 'sql', 'toml', 'yaml', 'avro'],
  'Docs / Mock':             ['doc', 'mock'],
};

function printList() {
  console.log(bold('\n  typemorph — available formats\n'));
  for (const [group, fmts] of Object.entries(FORMAT_GROUPS)) {
    console.log(bold(`  ${group}`));
    console.log(dim('  ' + fmts.join('  ')));
    console.log();
  }
  console.log(dim('  Usage: typemorph <format> [file.json]  or  cat data.json | typemorph <format>\n'));
}

// ── help ─────────────────────────────────────────────────────────────────────
const HELP = `
${bold('typemorph')} — schema engineering CLI

${bold('USAGE')}
  typemorph <format> [file]           Convert schema to target format
  typemorph quality  [file]           Grade schema quality (A–F)
  typemorph diff     <old> <new>      Detect breaking changes
  typemorph list                      Show all formats

${bold('OPTIONS')}
  --root, -r <name>     Root class name (default: Root)
  --breaking-only       Only show breaking changes  (diff)
  --version, -v         Show version
  --help,    -h         Show this help

${bold('EXAMPLES')}
  cat schema.json | typemorph typescript
  typemorph zod       schema.json --root User
  typemorph go        schema.json > models.go
  typemorph quality   schema.json
  typemorph diff      v1.json v2.json
  typemorph diff      v1.json v2.json --breaking-only
  typemorph list
`;

// ── grade coloring ───────────────────────────────────────────────────────────
function gradeColor(grade: string, s: string) {
  if (grade === 'A') return green(s);
  if (grade === 'B') return cyan(s);
  if (grade === 'C') return yellow(s);
  return red(s);
}

// ── quality command ──────────────────────────────────────────────────────────
function cmdQuality(text: string) {
  const schema = toSchema(text);
  const result = analyzeQuality(schema);
  const { score, grade, issues, stats } = result;

  const gradeStr = gradeColor(grade, `${grade}  ${score}/100`);
  console.log(`\n  ${bold('Schema Quality Score')}  ${gradeStr}\n`);
  console.log(dim(`  Fields: ${stats.totalFields}  |  any: ${stats.anyFields}  |  optional: ${stats.optionalFields}  |  naming: ${stats.namingStyle}  |  depth: ${stats.maxDepth}`));

  if (issues.length === 0) {
    console.log(green('\n  ✓ No issues found'));
  } else {
    console.log();
    for (const issue of issues) {
      const prefix = issue.severity === 'error' ? red('✖') : issue.severity === 'warning' ? yellow('⚠') : dim('ℹ');
      const loc = issue.path ? dim(` [${issue.path}]`) : '';
      console.log(`  ${prefix}  ${issue.message}${loc}`);
    }
  }
  console.log();
}

// ── diff command ─────────────────────────────────────────────────────────────
function severityColor(d: SchemaDiff) {
  if (d.severity === 'error')   return red(`✖  ${d.description}`);
  if (d.severity === 'warning') return yellow(`⚠  ${d.description}`);
  return dim(`ℹ  ${d.description}`);
}

function cmdDiff(oldText: string, newText: string, breakingOnly: boolean) {
  const oldSchema = toSchema(oldText);
  const newSchema = toSchema(newText);
  const diffs = compareSchemaTypes(oldSchema, newSchema);

  const filtered = breakingOnly ? diffs.filter(d => d.severity === 'error') : diffs;
  const breaking = diffs.filter(d => d.severity === 'error').length;
  const warnings = diffs.filter(d => d.severity === 'warning').length;
  const score = Math.max(0, 100 - breaking * 15 - warnings * 5);
  const scoreStr = score >= 90 ? green(`${score}/100`) : score >= 60 ? yellow(`${score}/100`) : red(`${score}/100`);

  console.log(`\n  ${bold('Breaking Change Detector')}  Compatibility ${scoreStr}  ${dim(`(−15/breaking · −5/warning)`)}\n`);

  if (filtered.length === 0) {
    console.log(green('  ✓ No ' + (breakingOnly ? 'breaking ' : '') + 'changes detected'));
  } else {
    for (const d of filtered) {
      const loc = d.path ? blue(`  ${d.path}`) : '';
      console.log(`${loc}`);
      console.log(`    ${severityColor(d)}`);
    }
  }

  console.log(dim(`\n  ${breaking} breaking  ·  ${warnings} warnings  ·  ${diffs.filter(d => d.severity === 'info').length} info\n`));

  if (breaking > 0) process.exit(1); // non-zero exit for CI
}

// ── convert command ───────────────────────────────────────────────────────────
function cmdConvert(format: string, text: string, root: string) {
  const { obj } = parseInput(text);
  try {
    const output = runEngine(obj, format, '', { rootName: root });
    if (!output || output.startsWith('// Unsupported')) {
      console.error(red(`typemorph: unsupported format "${format}". Run \`typemorph list\` to see all formats.`));
      process.exit(1);
    }
    process.stdout.write(output);
  } catch (e: any) {
    console.error(red(`typemorph: ${e?.message ?? String(e)}`));
    process.exit(1);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log('0.2.1');
    return;
  }

  const cmd = argv[0];

  if (cmd === 'list') { printList(); return; }

  // root option
  const rootIdx = argv.findIndex(a => a === '--root' || a === '-r');
  const root = rootIdx !== -1 ? argv[rootIdx + 1] : 'Root';

  // ── quality ──────────────────────────────────────────────────────────────
  if (cmd === 'quality') {
    const file = argv.slice(1).find(a => !a.startsWith('-') && a !== root);
    const text = file ? readFile(file) : await readStdin();
    cmdQuality(text);
    return;
  }

  // ── diff ─────────────────────────────────────────────────────────────────
  if (cmd === 'diff') {
    const files = argv.slice(1).filter(a => !a.startsWith('-') && a !== root);
    if (files.length < 2) {
      console.error(red('Usage: typemorph diff <old.json> <new.json>'));
      process.exit(1);
    }
    const breakingOnly = argv.includes('--breaking-only');
    cmdDiff(readFile(files[0]), readFile(files[1]), breakingOnly);
    return;
  }

  // ── convert ──────────────────────────────────────────────────────────────
  const format = cmd;
  const file = argv.slice(1).find(a => !a.startsWith('-') && a !== root);
  const text = file ? readFile(file) : await readStdin();
  cmdConvert(format, text, root);
}

main().catch(e => {
  console.error(red(`typemorph: ${e?.message ?? String(e)}`));
  process.exit(1);
});
