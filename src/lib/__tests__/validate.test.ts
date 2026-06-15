/**
 * Phase B: 生成コードを実際のパーサ/コンパイラに通して妥当性を検証する。
 *
 * 手持ちライブラリのみで構成（追加インストール不要）:
 *   - TypeScript 系 → TS コンパイラで構文チェック（ts.transpileModule）
 *   - JSON Schema   → ajv に compile させて妥当性チェック
 *   - YAML / OpenAPI(YAML) → js-yaml でパース
 *   - Python        → python -m py_compile で構文チェック（python があれば）
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import Ajv from 'ajv';
import yaml from 'js-yaml';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runEngine } from '../engine';

// ─── 入力パターン ────────────────────────────────────────────────────────────
const INPUTS: Record<string, unknown> = {
  basic: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice', age: 30, active: true },
  nulls: { user_id: 'u1', bio: null, website: null, follower_count: 12, is_verified: false },
  nested: { project: 'TM', owner: { id: 'u9', name: 'K' }, tags: ['a', 'b'] },
  union: [{ id: 1, value: 'x' }, { id: 2, value: 99 }],
  enumArr: [
    { order_id: 'o1', status: 'pending', amount: 100 },
    { order_id: 'o2', status: 'shipped', amount: 50 },
    { order_id: 'o3', status: 'pending', amount: 80 },
  ],
};

// ─── TypeScript 構文チェック ─────────────────────────────────────────────────
const TS_TARGETS = [
  'typescript', 'zod', 'yup', 'joi', 'valibot', 'superstruct',
  'drizzle', 'kysely', 'typeorm', 'sequelize', 'mongoose',
  'redux-slice', 'pinia', 'react-context', 'react-query', 'api-route',
];

function tsSyntaxErrors(code: string): string[] {
  const res = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      jsx: ts.JsxEmit.Preserve, // JSX を含んでも構文エラーにしない
    },
  });
  // transpileModule は型チェックをせず、構文エラーのみ報告する
  return (res.diagnostics ?? [])
    .filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('validate: TypeScript 系出力が構文的に正しい', () => {
  for (const target of TS_TARGETS) {
    for (const [inputName, input] of Object.entries(INPUTS)) {
      it(`${target} / ${inputName}`, () => {
        const code = runEngine(input, target, target, { rootName: 'Root' });
        const errors = tsSyntaxErrors(code);
        if (errors.length) {
          throw new Error(`TS 構文エラー:\n${errors.join('\n')}\n--- 出力 ---\n${code.slice(0, 500)}`);
        }
      });
    }
  }
});

// ─── JSON Schema 検証（ajv） ─────────────────────────────────────────────────
// format 値（uuid/int 等）は再帰的に除去してから compile する。
// ここで見たいのは「スキーマが構造的に妥当か」であって format の正否ではない。
function stripFormats(o: unknown): any {
  if (Array.isArray(o)) return o.map(stripFormats);
  if (o && typeof o === 'object') {
    const r: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === 'format') continue;
      r[k] = stripFormats(v);
    }
    return r;
  }
  return o;
}

describe('validate: JSON Schema 出力が ajv で compile できる', () => {
  const ajv = new Ajv({ allErrors: false }); // ajv v6: format は未定義なら無視される
  for (const [inputName, input] of Object.entries(INPUTS)) {
    it(`jsonschema / ${inputName}`, () => {
      const out = runEngine(input, 'jsonschema', 'jsonschema', { rootName: 'Root' });
      const parsed = JSON.parse(out); // まず JSON として妥当
      expect(() => ajv.compile(stripFormats(parsed))).not.toThrow();
    });
  }
});

// ─── JSON 出力フォーマット検証（JSON.parse できること） ──────────────────────
// これらは純 JSON を出力する。先頭に // コメントが付くと JSON.parse が落ちる。
describe('validate: JSON 出力フォーマットが JSON.parse できる', () => {
  for (const target of ['jsonschema', 'avro', 'postman', 'dynamodb', 'bigquery']) {
    for (const [inputName, input] of Object.entries(INPUTS)) {
      it(`${target} / ${inputName}`, () => {
        const out = runEngine(input, target, target, { rootName: 'Root' });
        expect(() => JSON.parse(out)).not.toThrow();
      });
    }
  }
});

// ─── YAML / OpenAPI(YAML) 検証（js-yaml） ───────────────────────────────────
describe('validate: YAML 系出力が js-yaml でパースできる', () => {
  for (const target of ['yaml', 'openapi']) {
    for (const [inputName, input] of Object.entries(INPUTS)) {
      it(`${target} / ${inputName}`, () => {
        const out = runEngine(input, target, target, { rootName: 'Root' });
        expect(() => yaml.load(out)).not.toThrow();
        expect(yaml.load(out)).toBeTruthy();
      });
    }
  }
});

// ─── Python 構文チェック（python があれば） ─────────────────────────────────
let hasPython = false;
try {
  execSync('python --version', { stdio: 'ignore' });
  hasPython = true;
} catch { /* python 無し → スキップ */ }

describe.runIf(hasPython)('validate: Python 出力が py_compile を通る', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tm-py-'));
  for (const target of ['python', 'django']) {
    for (const [inputName, input] of Object.entries(INPUTS)) {
      it(`${target} / ${inputName}`, () => {
        const code = runEngine(input, target, target, { rootName: 'Root' });
        const file = join(dir, `${target}_${inputName}.py`);
        writeFileSync(file, code);
        expect(() => execSync(`python -m py_compile "${file}"`, { stdio: 'pipe' })).not.toThrow();
      });
    }
  }
});
