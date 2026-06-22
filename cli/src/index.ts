import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

declare const __CLI_VERSION__: string;

import { runEngine, inferSchema, parseYAML } from '../../src/lib/engine';
import { isOpenAPISpec, parseOpenAPIComponents } from '../../src/lib/openapi-parser';
import { isJSONSchema, parseJSONSchema } from '../../src/lib/jsonschema-parser';
import { analyzeQuality } from '../../src/lib/quality';
import { compareSchemaTypes, type SchemaDiff } from '../../src/lib/diff';
import { generateSampleJson } from '../../src/lib/reverse';
import { parseZodToSchema } from '../../src/lib/parsers';
import { validateOutputs, inferExpectedSchema, type OutputIssue } from '../../src/lib/validate';
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

// Returns all named schemas from the input (multi-schema for OpenAPI/JSON Schema)
function toSchemas(text: string): { name: string; schema: Schema }[] {
  const { obj } = parseInput(text);
  if (isOpenAPISpec(obj)) {
    const schemas = parseOpenAPIComponents(obj);
    return schemas.length > 0 ? schemas : [{ name: 'Root', schema: inferSchema(obj) }];
  }
  if (isJSONSchema(obj)) {
    const schemas = parseJSONSchema(obj);
    return schemas.length > 0 ? schemas : [{ name: 'Root', schema: inferSchema(obj) }];
  }
  return [{ name: 'Root', schema: inferSchema(obj) }];
}

// Single-schema helper kept for convert command
function toSchema(text: string): Schema {
  return toSchemas(text)[0].schema;
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
  typemorph <format> <f1> <f2> ...    Merge multiple files as samples of one schema
  typemorph reverse  [file.ts]        Generate JSON sample from TypeScript interfaces
  typemorph quality  [file]           Grade schema quality (A–F)
  typemorph diff     <old> <new>      Detect breaking changes
  typemorph validate <schema> <out>   Validate LLM/API JSON output against a Zod schema
  typemorph validate --infer <out>    Infer a Zod schema from known-good outputs
  typemorph list                      Show all formats

${bold('OPTIONS')}
  --root, -r <name>     Root class name for convert / infer (default: Root)
  --samples             Treat a single array input as samples of one schema (convert)
  --schema <name>       Target a specific named schema (OpenAPI/JSON Schema)
  --min-grade <grade>   Fail (exit 1) if quality grade is below threshold (quality)
  --breaking-only       Only show breaking changes (diff)
  --infer               Infer a schema from good outputs instead of validating (validate)
  --strict              Treat warnings (extra fields, drift) as failures (validate)
  --out <file>          Write inferred schema to a file (validate --infer)
  --format <fmt>        Report format: pretty | json | github (validate)
  --json                Output results as JSON (quality, diff)
  --version, -v         Show version
  --help,    -h         Show this help

${bold('EXAMPLES')}
  cat schema.json | typemorph typescript
  typemorph zod       schema.json --root User
  typemorph zod       r1.json r2.json r3.json     # merge samples → one schema
  typemorph zod       responses.json --samples    # array = samples, not items
  typemorph go        schema.json > models.go
  typemorph quality   schema.json
  typemorph quality   openapi.yaml              # grades all schemas
  typemorph quality   openapi.yaml --min-grade B
  typemorph quality   openapi.yaml --schema User
  typemorph quality   openapi.yaml --json
  typemorph diff      v1.json v2.json
  typemorph diff      v1.yaml v2.yaml           # diffs all matching schemas
  typemorph diff      v1.yaml v2.yaml --schema User
  typemorph diff      v1.json v2.json --breaking-only
  typemorph diff      v1.json v2.json --json
  typemorph validate  schema.ts responses.jsonl
  typemorph validate  schema.ts outputs.json --strict --format github
  typemorph validate  --infer good-outputs.jsonl --out schema.ts
  typemorph reverse   models.ts
  cat types.ts | typemorph reverse
  typemorph list
`;

// ── grade helpers ────────────────────────────────────────────────────────────
const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F'];

function gradeColor(grade: string, s: string) {
  if (grade === 'A') return green(s);
  if (grade === 'B') return cyan(s);
  if (grade === 'C') return yellow(s);
  return red(s);
}

function gradeBelowThreshold(grade: string, minGrade: string): boolean {
  return GRADE_ORDER.indexOf(grade) > GRADE_ORDER.indexOf(minGrade);
}

// ── quality command ──────────────────────────────────────────────────────────
function cmdQuality(text: string, opts: { schema?: string; minGrade?: string; json?: boolean }) {
  let named = toSchemas(text);

  if (opts.schema) {
    const match = named.find(s => s.name.toLowerCase() === opts.schema!.toLowerCase());
    if (!match) {
      console.error(red(`Schema "${opts.schema}" not found. Available: ${named.map(s => s.name).join(', ')}`));
      process.exit(1);
    }
    named = [match];
  }

  const results = named.map(({ name, schema }) => ({ name, ...analyzeQuality(schema) }));

  // worst = lowest grade (highest index in GRADE_ORDER), then lowest score
  const worst = results.reduce((a, b) =>
    GRADE_ORDER.indexOf(b.grade) > GRADE_ORDER.indexOf(a.grade) ||
    (b.grade === a.grade && b.score < a.score) ? b : a
  );

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      schemas: results.map(({ name, grade, score, issues, stats }) => ({ name, grade, score, issues, stats })),
      worst: { name: worst.name, grade: worst.grade, score: worst.score },
    }, null, 2) + '\n');
  } else {
    const multi = results.length > 1;
    if (multi) {
      console.log(`\n  ${bold('Schema Quality')}  ${dim(`(${results.length} schemas)`)}\n`);
      const nameWidth = Math.max(...results.map(r => r.name.length));
      for (const r of results) {
        const gradeStr = gradeColor(r.grade, `${r.grade}  ${r.score}/100`);
        const pad = r.name.padEnd(nameWidth);
        const topIssue = r.issues[0] ? dim(`  — ${r.issues[0].message}`) : '';
        console.log(`  ${bold(pad)}  ${gradeStr}${topIssue}`);
      }
      console.log();
      if (results.length > 1) {
        console.log(dim(`  Worst: ${worst.name}  ${worst.grade}  ${worst.score}/100`));
      }
    } else {
      const r = results[0];
      const gradeStr = gradeColor(r.grade, `${r.grade}  ${r.score}/100`);
      console.log(`\n  ${bold('Schema Quality Score')}  ${gradeStr}\n`);
      console.log(dim(`  Fields: ${r.stats.totalFields}  |  any: ${r.stats.anyFields}  |  optional: ${r.stats.optionalFields}  |  naming: ${r.stats.namingStyle}  |  depth: ${r.stats.maxDepth}`));
    }

    // issues for single schema, or all issues when --schema specified
    const issueSource = !multi ? results[0] : null;
    if (issueSource) {
      if (issueSource.issues.length === 0) {
        console.log(green('\n  ✓ No issues found'));
      } else {
        console.log();
        for (const issue of issueSource.issues) {
          const prefix = issue.severity === 'error' ? red('✖') : issue.severity === 'warning' ? yellow('⚠') : dim('ℹ');
          const loc = issue.path ? dim(` [${issue.path}]`) : '';
          console.log(`  ${prefix}  ${issue.message}${loc}`);
        }
      }
    }
    console.log();
  }

  if (opts.minGrade && gradeBelowThreshold(worst.grade, opts.minGrade)) {
    if (!opts.json) {
      console.error(red(`  ✖ ${worst.name}: Grade ${worst.grade} is below required minimum ${opts.minGrade}`));
    }
    process.exit(1);
  }
}

// ── diff command ─────────────────────────────────────────────────────────────
function severityColor(d: SchemaDiff) {
  if (d.severity === 'error')   return red(`✖  ${d.description}`);
  if (d.severity === 'warning') return yellow(`⚠  ${d.description}`);
  return dim(`ℹ  ${d.description}`);
}

interface DiffResult {
  name: string;
  score: number;
  breaking: number;
  warnings: number;
  info: number;
  diffs: SchemaDiff[];
}

function diffSchemas(
  oldNamed: { name: string; schema: Schema }[],
  newNamed: { name: string; schema: Schema }[],
  opts: { schema?: string; breakingOnly: boolean },
): DiffResult[] {
  if (opts.schema) {
    const lo = opts.schema.toLowerCase();
    const oldMatch = oldNamed.find(s => s.name.toLowerCase() === lo);
    const newMatch = newNamed.find(s => s.name.toLowerCase() === lo);
    if (!oldMatch) { console.error(red(`Schema "${opts.schema}" not found in old file`)); process.exit(1); }
    if (!newMatch) { console.error(red(`Schema "${opts.schema}" not found in new file`)); process.exit(1); }
    return [buildDiffResult(opts.schema, oldMatch.schema, newMatch.schema, opts.breakingOnly)];
  }

  // When both sides have multiple named schemas: match by name
  if (oldNamed.length > 1 || newNamed.length > 1) {
    const oldMap = new Map(oldNamed.map(s => [s.name, s.schema]));
    const newMap = new Map(newNamed.map(s => [s.name, s.schema]));
    const names = [...new Set([...oldMap.keys(), ...newMap.keys()])];
    return names.map(name => {
      const oldSchema = oldMap.get(name);
      const newSchema = newMap.get(name);
      if (!oldSchema) return { name, score: 0, breaking: 1, warnings: 0, info: 0, diffs: [{ path: name, type: 'added' as const, severity: 'error' as const, description: `Schema "${name}" was added (new schema, existing consumers unaffected — but flag for review)` }] };
      if (!newSchema) return { name, score: 0, breaking: 1, warnings: 0, info: 0, diffs: [{ path: name, type: 'removed' as const, severity: 'error' as const, description: `Schema "${name}" was removed. All consumers will break.` }] };
      return buildDiffResult(name, oldSchema, newSchema, opts.breakingOnly);
    });
  }

  // Single schema on both sides
  return [buildDiffResult(oldNamed[0].name, oldNamed[0].schema, newNamed[0].schema, opts.breakingOnly)];
}

function buildDiffResult(name: string, oldSchema: Schema, newSchema: Schema, breakingOnly: boolean): DiffResult {
  const diffs = compareSchemaTypes(oldSchema, newSchema);
  const breaking = diffs.filter(d => d.severity === 'error').length;
  const warnings = diffs.filter(d => d.severity === 'warning').length;
  const info = diffs.filter(d => d.severity === 'info').length;
  const score = Math.max(0, 100 - breaking * 15 - warnings * 5);
  const filtered = breakingOnly ? diffs.filter(d => d.severity === 'error') : diffs;
  return { name, score, breaking, warnings, info, diffs: filtered };
}

function cmdDiff(oldText: string, newText: string, opts: { schema?: string; breakingOnly: boolean; json?: boolean }) {
  const oldNamed = toSchemas(oldText);
  const newNamed = toSchemas(newText);
  const results = diffSchemas(oldNamed, newNamed, opts);

  const totalBreaking = results.reduce((s, r) => s + r.breaking, 0);
  const totalWarnings = results.reduce((s, r) => s + r.warnings, 0);
  const totalInfo     = results.reduce((s, r) => s + r.info, 0);
  const overallScore  = results.length === 1 ? results[0].score
    : Math.max(0, 100 - totalBreaking * 15 - totalWarnings * 5);

  if (opts.json) {
    process.stdout.write(JSON.stringify({ score: overallScore, breaking: totalBreaking, warnings: totalWarnings, info: totalInfo, schemas: results }, null, 2) + '\n');
  } else {
    const scoreStr = overallScore >= 90 ? green(`${overallScore}/100`) : overallScore >= 60 ? yellow(`${overallScore}/100`) : red(`${overallScore}/100`);
    const multi = results.length > 1;
    const header = multi ? `${bold('Breaking Change Detector')}  ${dim(`(${results.length} schemas)`)}  Compatibility ${scoreStr}` : `${bold('Breaking Change Detector')}  Compatibility ${scoreStr}  ${dim('(−15/breaking · −5/warning)')}`;
    console.log(`\n  ${header}\n`);

    for (const r of results) {
      if (multi) {
        const tag = r.breaking > 0 ? red(`✖ ${r.breaking} breaking`) : r.warnings > 0 ? yellow(`⚠ ${r.warnings} warnings`) : green('✓ clean');
        console.log(`  ${bold(r.name.padEnd(20))}  ${tag}`);
        if (r.diffs.length > 0) {
          for (const d of r.diffs) {
            const loc = d.path ? blue(`    ${d.path}`) : '';
            if (loc) console.log(loc);
            console.log(`      ${severityColor(d)}`);
          }
          console.log();
        }
      } else {
        if (r.diffs.length === 0) {
          console.log(green('  ✓ No ' + (opts.breakingOnly ? 'breaking ' : '') + 'changes detected'));
        } else {
          for (const d of r.diffs) {
            const loc = d.path ? blue(`  ${d.path}`) : '';
            if (loc) console.log(loc);
            console.log(`    ${severityColor(d)}`);
          }
        }
      }
    }

    console.log(dim(`\n  ${totalBreaking} breaking  ·  ${totalWarnings} warnings  ·  ${totalInfo} info\n`));
  }

  if (totalBreaking > 0) process.exit(1);
}

// ── validate command ─────────────────────────────────────────────────────────
// Load the *expected* schema: a Zod source (.ts/.js or anything containing `z.`)
// goes through the reverse parser; otherwise treat as JSON Schema / sample JSON.
function loadExpectedSchema(file: string): Schema {
  const text = readFile(file);
  const looksZod = /\.(ts|js|mts|cts)$/i.test(file) || /\bz\s*\./.test(text);
  if (looksZod) {
    const schema = parseZodToSchema(text);
    if (!schema) {
      console.error(red(`typemorph validate: could not parse a Zod schema from "${file}"`));
      process.exit(1);
    }
    return schema;
  }
  return toSchema(text);
}

// Read output records: .jsonl = one JSON object per line; otherwise a JSON array
// (each element is a record) or a single JSON object.
function readRecords(file: string): unknown[] {
  const text = readFile(file);
  if (/\.jsonl$/i.test(file)) {
    return text.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
      try { return JSON.parse(line); }
      catch { console.error(red(`typemorph validate: ${file} line ${i + 1} is not valid JSON`)); process.exit(1); }
    });
  }
  const { obj } = parseInput(text);
  return Array.isArray(obj) ? obj : [obj];
}

function cmdValidate(expected: Schema, records: unknown[], opts: { strict: boolean; format: string }) {
  const report = validateOutputs(expected, records, { strict: opts.strict });

  if (opts.format === 'json') {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else if (opts.format === 'github') {
    const lines: string[] = [];
    lines.push(`## TypeMorph · LLM output validation`);
    lines.push('');
    lines.push(`**${report.passed} / ${report.total} passed**${report.failed ? ` · ${report.failed} failed` : ''}`);
    if (report.issues.length > 0) {
      lines.push('');
      lines.push('| output | field | problem |');
      lines.push('|---|---|---|');
      for (const it of report.issues) {
        const icon = it.severity === 'error' ? '🔴' : '🟡';
        lines.push(`| #${it.recordIndex} | \`${it.path || 'root'}\` | ${icon} ${it.message.replace(/\|/g, '\\|')} |`);
      }
    }
    if (report.summary.length > 0) {
      lines.push('');
      lines.push(report.summary.map(s => `${s.label} ×${s.count}`).join(' · '));
    }
    process.stdout.write(lines.join('\n') + '\n');
  } else {
    console.log(`\n  ${bold('TypeMorph validate')}  ${dim(`${report.total} output${report.total === 1 ? '' : 's'}`)}\n`);
    const passStr = report.passed > 0 ? green(`✓ ${report.passed} passed`) : dim('✓ 0 passed');
    const failStr = report.failed > 0 ? red(`✗ ${report.failed} failed`) : dim('✗ 0 failed');
    console.log(`  ${passStr}   ${failStr}\n`);

    const byRecord = new Map<number, OutputIssue[]>();
    for (const it of report.issues) {
      if (!byRecord.has(it.recordIndex)) byRecord.set(it.recordIndex, []);
      byRecord.get(it.recordIndex)!.push(it);
    }
    for (const [idx, issues] of [...byRecord.entries()].sort((a, b) => a[0] - b[0])) {
      const hasError = issues.some(i => i.severity === 'error');
      console.log(`  ${hasError ? red('✗') : yellow('⚠')} output #${idx}`);
      for (const it of issues) {
        const body = it.severity === 'error' ? red(it.message) : yellow(it.message);
        console.log(`      ${body}`);
        if (it.fix) console.log(`        ${dim('→ ' + it.fix)}`);
      }
    }
    if (report.summary.length > 0) {
      console.log(dim(`\n  ${report.summary.map(s => `${s.label} ×${s.count}`).join('  ·  ')}`));
    }
    if (report.failed > 0) {
      console.log(dim(`  ${report.failed} of ${report.total} outputs would fail a strict parser.\n`));
    } else {
      console.log(green(`  ✓ all outputs conform\n`));
    }
  }

  if (!report.ok) process.exit(1);
}

// ── convert command ───────────────────────────────────────────────────────────
function cmdConvert(format: string, obj: any, root: string, samplesMode: boolean) {
  try {
    const output = runEngine(obj, format, '', { rootName: root, samplesMode });
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
    console.log(__CLI_VERSION__);
    return;
  }

  const cmd = argv[0];
  if (cmd === 'list') { printList(); return; }

  // shared flags
  const rootIdx = argv.findIndex(a => a === '--root' || a === '-r');
  const root = rootIdx !== -1 ? argv[rootIdx + 1] : 'Root';
  const schemaIdx = argv.findIndex(a => a === '--schema');
  const schemaFilter = schemaIdx !== -1 ? argv[schemaIdx + 1] : undefined;
  const jsonOut = argv.includes('--json');

  // ── reverse ──────────────────────────────────────────────────────────────
  if (cmd === 'reverse') {
    const file = argv.slice(1).find(a => !a.startsWith('-'));
    const text = file ? readFile(file) : await readStdin();
    const { json, error } = generateSampleJson(text);
    if (error || !json) {
      console.error(red(`typemorph reverse: ${error ?? 'No interfaces found'}`));
      process.exit(1);
    }
    process.stdout.write(json + '\n');
    return;
  }

  // ── quality ──────────────────────────────────────────────────────────────
  if (cmd === 'quality') {
    const minGradeIdx = argv.findIndex(a => a === '--min-grade');
    const minGrade = minGradeIdx !== -1 ? argv[minGradeIdx + 1]?.toUpperCase() : undefined;
    if (minGrade && !GRADE_ORDER.includes(minGrade)) {
      console.error(red(`Invalid --min-grade "${minGrade}". Must be one of: ${GRADE_ORDER.join(', ')}`));
      process.exit(1);
    }
    const flagValues = new Set([root, minGrade, schemaFilter].filter(Boolean));
    const file = argv.slice(1).find(a => !a.startsWith('-') && !flagValues.has(a));
    const text = file ? readFile(file) : await readStdin();
    cmdQuality(text, { schema: schemaFilter, minGrade, json: jsonOut });
    return;
  }

  // ── diff ─────────────────────────────────────────────────────────────────
  if (cmd === 'diff') {
    const flagValues = new Set([root, schemaFilter].filter(Boolean));
    const files = argv.slice(1).filter(a => !a.startsWith('-') && !flagValues.has(a));
    if (files.length < 2) {
      console.error(red('Usage: typemorph diff <old.json> <new.json> [--schema <name>]'));
      process.exit(1);
    }
    const breakingOnly = argv.includes('--breaking-only');
    cmdDiff(readFile(files[0]), readFile(files[1]), { schema: schemaFilter, breakingOnly, json: jsonOut });
    return;
  }

  // ── validate ───────────────────────────────────────────────────────────────
  if (cmd === 'validate') {
    const infer = argv.includes('--infer');
    const strict = argv.includes('--strict');
    const fmtIdx = argv.findIndex(a => a === '--format');
    const format = fmtIdx !== -1 ? (argv[fmtIdx + 1] ?? 'pretty') : 'pretty';
    if (!['pretty', 'json', 'github'].includes(format)) {
      console.error(red(`Invalid --format "${format}". Must be one of: pretty, json, github`));
      process.exit(1);
    }
    const outIdx = argv.findIndex(a => a === '--out');
    const outFile = outIdx !== -1 ? argv[outIdx + 1] : undefined;

    const flagValues = new Set([root, schemaFilter, format, outFile].filter(Boolean));
    const files = argv.slice(1).filter(a => !a.startsWith('-') && !flagValues.has(a));

    if (infer) {
      if (files.length < 1) {
        console.error(red('Usage: typemorph validate --infer <good-outputs.jsonl> [--out schema.ts]'));
        process.exit(1);
      }
      const records = readRecords(files[0]);
      const zod = runEngine(records, 'zod', '', { rootName: root, samplesMode: true });
      if (outFile) {
        fs.writeFileSync(path.resolve(outFile), zod);
        console.error(green(`✓ wrote inferred schema to ${outFile}`));
      } else {
        process.stdout.write(zod);
      }
      return;
    }

    if (files.length < 2) {
      console.error(red('Usage: typemorph validate <schema.ts> <outputs.jsonl> [--strict] [--format github]'));
      process.exit(1);
    }
    const expected = loadExpectedSchema(files[0]);
    const records = readRecords(files[1]);
    cmdValidate(expected, records, { strict, format });
    return;
  }

  // ── convert ──────────────────────────────────────────────────────────────
  const format = cmd;
  const flagValues = new Set([root, schemaFilter].filter(Boolean));
  const files = argv.slice(1).filter(a => !a.startsWith('-') && !flagValues.has(a));

  // Samples mode (F-8): multiple input files are N samples of ONE schema → merge them
  // (widening enums, marking missing fields optional) and emit a single schema, not an
  // array. Also triggered explicitly by --samples on a single array input.
  if (files.length >= 2) {
    const objs = files.map(f => parseInput(readFile(f)).obj);
    cmdConvert(format, objs, root, true);
    return;
  }

  const text = files[0] ? readFile(files[0]) : await readStdin();
  const { obj } = parseInput(text);
  const samplesMode = argv.includes('--samples') && Array.isArray(obj);
  cmdConvert(format, obj, root, samplesMode);
}

main().catch(e => {
  console.error(red(`typemorph: ${e?.message ?? String(e)}`));
  process.exit(1);
});
