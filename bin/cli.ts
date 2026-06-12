import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { runEngine, inferSchema } from '../src/lib/engine';
import { compareSchemas } from '../src/lib/diff';

// ─── helpers ────────────────────────────────────────────────────────────────

function readFile(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => (data += line + '\n'));
    rl.on('close', () => resolve(data.trim()));
  });
}

function parseInput(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    console.error('typemorph: input is not valid JSON');
    process.exit(1);
  }
}

function bold(s: string) { return `\x1b[1m${s}\x1b[0m`; }
function dim(s: string)  { return `\x1b[2m${s}\x1b[0m`; }
function red(s: string)  { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s: string) { return `\x1b[33m${s}\x1b[0m`; }
function cyan(s: string) { return `\x1b[36m${s}\x1b[0m`; }

// ─── commands ───────────────────────────────────────────────────────────────

function cmdList() {
  const categories: Record<string, string[]> = {
    'TypeScript / Validation': ['typescript', 'zod', 'yup', 'joi', 'valibot'],
    'Backend': ['go', 'rust', 'java', 'csharp', 'python', 'swift', 'kotlin', 'php', 'dart', 'scala', 'haskell', 'elixir', 'clojure'],
    'Database': ['prisma', 'mysql', 'postgres', 'sqlite', 'snowflake', 'mongodb', 'mongoose', 'sequelize', 'typeorm', 'drizzle', 'dynamodb', 'bigquery'],
    'API / Schema': ['openapi', 'graphql', 'proto', 'postman', 'http'],
    'Frontend': ['react-props', 'react-context', 'redux', 'pinia', 'vue-props', 'svelte-props'],
    'Data / Markup': ['json-schema', 'csv', 'sql-insert', 'toml', 'yaml', 'markdown', 'avro'],
    'Docs': ['doc', 'mock'],
    'Other': ['r', 'solidity', 'cobol', 'arduino', 'godot', 'django', 'rails'],
  };

  console.log(bold('\nTypeMorph — available formats\n'));
  for (const [cat, formats] of Object.entries(categories)) {
    console.log(bold(cat));
    console.log(dim('  ' + formats.join('  ')));
    console.log();
  }
  console.log(dim('Usage: typemorph <format> [file.json]  or  cat data.json | typemorph <format>\n'));
}

function cmdDiff(fileA: string, fileB: string, breakingOnly: boolean) {
  const a = parseInput(readFile(fileA));
  const b = parseInput(readFile(fileB));
  const diffs = compareSchemas(a, b);

  const shown = breakingOnly ? diffs.filter(d => d.severity === 'error') : diffs;

  if (shown.length === 0) {
    console.log(dim('No differences found.'));
    return;
  }

  console.log(bold(`\n  Schema diff: ${path.basename(fileA)} → ${path.basename(fileB)}\n`));

  for (const d of shown) {
    const icon = d.severity === 'error' ? red('✖') : d.severity === 'warning' ? yellow('⚠') : cyan('＋');
    const badge = d.type === 'removed' ? red('removed') : d.type === 'added' ? cyan('added') : yellow('changed');
    console.log(`  ${icon}  ${bold(d.path)}  ${dim('[' + badge + ']')}`);
    console.log(dim(`     ${d.description}`));
    if (d.oldType && d.newType) {
      console.log(dim(`     ${d.oldType} → ${d.newType}`));
    }
    console.log();
  }

  const errors = diffs.filter(d => d.severity === 'error').length;
  const warnings = diffs.filter(d => d.severity === 'warning').length;
  const infos = diffs.filter(d => d.severity === 'info').length;
  console.log(dim(`  ${errors} breaking  ${warnings} warnings  ${infos} info\n`));

  if (errors > 0) process.exit(1);
}

async function cmdGenerate(format: string, file: string | undefined, rootName: string) {
  const raw = file ? readFile(file) : await readStdin();
  const data = parseInput(raw);
  const result = runEngine(data, format, '', { rootName });
  process.stdout.write(result + '\n');
}

// ─── main ───────────────────────────────────────────────────────────────────

const HELP = `
${bold('TypeMorph CLI')}

${bold('Usage')}
  typemorph <format> [file.json]        Convert JSON to target format
  typemorph diff <old.json> <new.json>  Compare two JSON schemas
  typemorph list                        Show all available formats

${bold('Options')}
  --root, -r <name>        Root type name  (default: Root)
  --breaking-only          diff: show only breaking changes
  --help, -h               Show this help
  --version, -v            Show version

${bold('Examples')}
  cat api.json | typemorph zod
  typemorph typescript response.json --root ApiResponse
  typemorph go data.json > models.go
  typemorph diff v1.json v2.json
  typemorph diff v1.json v2.json --breaking-only
  typemorph list
`;

async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    return;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    console.log('0.1.0');
    return;
  }

  const cmd = argv[0];

  if (cmd === 'list') {
    cmdList();
    return;
  }

  if (cmd === 'diff') {
    const fileA = argv[1];
    const fileB = argv[2];
    if (!fileA || !fileB) {
      console.error('Usage: typemorph diff <old.json> <new.json>');
      process.exit(1);
    }
    const breakingOnly = argv.includes('--breaking-only');
    cmdDiff(fileA, fileB, breakingOnly);
    return;
  }

  // generate mode
  const format = cmd;
  const rootIdx = argv.findIndex(a => a === '--root' || a === '-r');
  const rootName = rootIdx !== -1 ? argv[rootIdx + 1] : 'Root';

  const fileArg = argv.slice(1).find(a => !a.startsWith('-') && argv[rootIdx + 1] !== a);

  await cmdGenerate(format, fileArg, rootName);
}

main().catch((err) => {
  console.error(red('typemorph: ' + (err?.message ?? String(err))));
  process.exit(1);
});
