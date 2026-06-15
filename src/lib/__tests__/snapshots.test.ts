/**
 * Snapshot tests for TypeMorph generators.
 *
 * 目的: コードジェネレータの出力を丸ごと保存し、意図しない変更を即検知する。
 * 初回実行: vitest --update-snapshots で __snapshots__/ にゴールデン出力を保存。
 * 以降: 出力が変わるとテスト失敗 → diff を見て「意図的な変更か/バグか」を判断。
 */

import { describe, it, expect } from 'vitest';
import { runEngine } from '../engine';

// ─── 代表的な入力パターン ───────────────────────────────────────────────────

/** 基本: フラットなオブジェクト、型多様 */
const BASIC = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  score: 98.6,
  active: true,
};

/** null / optional フィールド混在 */
const WITH_NULLS = {
  user_id: 'usr_001',
  display_name: 'Bob',
  bio: null,
  website: null,
  follower_count: 1200,
  is_verified: false,
};

/** ネストオブジェクト + 配列 */
const NESTED = {
  project: 'TypeMorph',
  owner: {
    id: 'usr_99',
    name: 'Kouki',
    address: {
      city: 'Tokyo',
      zip: '150-0001',
    },
  },
  tags: ['typescript', 'zod', 'open-source'],
  collaborators: [
    { id: 'usr_01', name: 'Alice', role: 'maintainer' },
    { id: 'usr_02', name: 'Bob',   role: 'contributor' },
  ],
};

/** enum推論: status/role など繰り返し値 */
const WITH_ENUM = [
  { order_id: 'ord_1', status: 'pending',   amount: 100, currency: 'USD' },
  { order_id: 'ord_2', status: 'shipped',   amount: 250, currency: 'JPY' },
  { order_id: 'ord_3', status: 'delivered', amount: 80,  currency: 'EUR' },
  { order_id: 'ord_4', status: 'pending',   amount: 320, currency: 'USD' },
];

/** discriminated union: type フィールドで構造が変わる */
const DISCRIMINATED = [
  { type: 'text',  content: 'Hello world', char_count: 11 },
  { type: 'image', url: 'https://cdn.example.com/img.png', width: 1920, height: 1080 },
  { type: 'video', url: 'https://cdn.example.com/vid.mp4', duration_sec: 120 },
  { type: 'text',  content: 'Another post', char_count: 12 },
];

/** optional フィールド: 一部サンプルにだけ存在 → nickname が optional 判定 */
const OPTIONAL_FIELD = [
  { id: 1, name: 'Alice', nickname: 'Al' },
  { id: 2, name: 'Bob' },  // nickname が無い → optional
];

/** datetime フォーマット検出用 */
const WITH_DATETIME = {
  name: 'launch',
  created_at: '2024-01-15T10:30:00Z',
};

// ─── Tier 1: 主要言語ターゲット ─────────────────────────────────────────────

const TIER1_TARGETS = [
  'typescript',
  'zod',
  'go',
  'rust',
  'python',
  'java',
  'csharp',
  'swift',
  'kotlin',
  'php',
  'dart',
  'protobuf',
  'graphql',
] as const;

describe('Tier1 generators — BASIC input', () => {
  for (const target of TIER1_TARGETS) {
    it(`${target}`, () => {
      expect(runEngine(BASIC, target, target, { rootName: 'User' })).toMatchSnapshot();
    });
  }
});

describe('Tier1 generators — WITH_NULLS (null/optional fields)', () => {
  for (const target of TIER1_TARGETS) {
    it(`${target}`, () => {
      expect(runEngine(WITH_NULLS, target, target, { rootName: 'Profile' })).toMatchSnapshot();
    });
  }
});

describe('Tier1 generators — NESTED (object + array)', () => {
  for (const target of TIER1_TARGETS) {
    it(`${target}`, () => {
      expect(runEngine(NESTED, target, target, { rootName: 'Project' })).toMatchSnapshot();
    });
  }
});

describe('Tier1 generators — WITH_ENUM (array root, enum detection)', () => {
  for (const target of TIER1_TARGETS) {
    it(`${target}`, () => {
      expect(runEngine(WITH_ENUM, target, target, { rootName: 'Order' })).toMatchSnapshot();
    });
  }
});

describe('Tier1 generators — DISCRIMINATED (discriminated union)', () => {
  for (const target of TIER1_TARGETS) {
    it(`${target}`, () => {
      expect(runEngine(DISCRIMINATED, target, target, { rootName: 'Post' })).toMatchSnapshot();
    });
  }
});

// ─── Tier 2: 代表的な拡張ターゲット ─────────────────────────────────────────

const TIER2_TARGETS = [
  'mongoose',
  'prisma',
  'drizzle',
  'typeorm',
  'kysely',
  'sequelize',
  'mysql',
  'postgres',
  'sqlite',
  'yup',
  'joi',
  'valibot',
  'superstruct',
  'react-props',
  'vue-props',
  'svelte-props',
  'solid-props',
  'redux-slice',
  'pinia',
  'react-context',
  'openapi',
  'avro',
  'mermaid',
  'toml',
  'yaml',
  'env',
  'markdown',
  'csv',
  'go',
  'elixir',
  'elm',
  'haskell',
  'scala',
  'arduino',
  'c',
  'cpp',
] as const;

describe('Tier2 generators — BASIC input', () => {
  for (const target of TIER2_TARGETS) {
    it(`${target}`, () => {
      expect(runEngine(BASIC, target, target, { rootName: 'User' })).toMatchSnapshot();
    });
  }
});

describe('Tier2 generators — WITH_NULLS', () => {
  for (const target of TIER2_TARGETS) {
    it(`${target}`, () => {
      expect(runEngine(WITH_NULLS, target, target, { rootName: 'Profile' })).toMatchSnapshot();
    });
  }
});

// ─── エッジケース個別テスト ──────────────────────────────────────────────────

describe('edge cases', () => {
  it('空オブジェクト → 全ターゲットでエラーにならない', () => {
    const result = runEngine({}, 'typescript', 'typescript');
    expect(result).toMatchSnapshot();
  });

  it('空配列 → 全ターゲットでエラーにならない', () => {
    const result = runEngine([], 'typescript', 'typescript');
    expect(result).toMatchSnapshot();
  });

  it('プリミティブ値 (string) をルートに渡す', () => {
    const result = runEngine('hello', 'typescript', 'typescript');
    expect(result).toMatchSnapshot();
  });

  it('数値だけのフラット配列', () => {
    const result = runEngine([1, 2, 3, 4, 5], 'typescript', 'typescript');
    expect(result).toMatchSnapshot();
  });

  it('深いネスト (5階層)', () => {
    const deep = { a: { b: { c: { d: { e: { value: 42 } } } } } };
    expect(runEngine(deep, 'typescript', 'typescript', { rootName: 'Deep' })).toMatchSnapshot();
  });

  it('全フィールドnull', () => {
    const allNull = { name: null, age: null, active: null };
    expect(runEngine(allNull, 'typescript', 'typescript')).toMatchSnapshot();
  });

  it('配列の中にnullが混じる', () => {
    const mixed = [
      { id: 1, name: 'Alice', extra: 'x' },
      { id: 2, name: 'Bob',   extra: null },
      { id: 3, name: 'Carol'             },  // extraが存在しない
    ];
    expect(runEngine(mixed, 'typescript', 'typescript', { rootName: 'Item' })).toMatchSnapshot();
  });

  it('同じキーが異なる型を持つ配列 (union)', () => {
    const mixed = [
      { id: 1,       value: 'hello' },
      { id: 'str_2', value: 42      },
    ];
    expect(runEngine(mixed, 'typescript', 'typescript', { rootName: 'Mixed' })).toMatchSnapshot();
  });

  it('UUID/email/url フォーマット → Zodで .uuid() .email() .url() が出る', () => {
    const fmt = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      website: 'https://example.com',
    };
    expect(runEngine(fmt, 'zod', 'zod', { rootName: 'Contact' })).toMatchSnapshot();
  });

  it('amount+currency の隣接コンテキスト補正 → amount が float になる', () => {
    const payment = { amount: 1000, currency: 'USD', note: 'test' };
    expect(runEngine(payment, 'typescript', 'typescript', { rootName: 'Payment' })).toMatchSnapshot();
  });

  it('very large enum (7値以上) → enumにならずstringになる', () => {
    const data = [
      { color: 'red' }, { color: 'blue' }, { color: 'green' },
      { color: 'yellow' }, { color: 'purple' }, { color: 'orange' },
      { color: 'pink' }, { color: 'black' },
    ];
    expect(runEngine(data, 'typescript', 'typescript', { rootName: 'Item' })).toMatchSnapshot();
  });
});

// ─── Phase 2: 確認済みバグの回帰防止（セマンティックテスト） ──────────────────
// これらは Phase 1 で実コード検証済みのバグ。修正前は失敗し、Phase 3 修正後に通過する。
describe('confirmed bug regressions', () => {
  // Bug #1 Dart: optional フィールドが無条件で `required` になる (generators.ts:442)
  it('Dart: optional フィールドは required にならない', () => {
    const r = runEngine(OPTIONAL_FIELD, 'dart', 'dart', { rootName: 'Item' });
    expect(r).toContain('this.nickname');         // フィールド自体は出る
    expect(r).not.toMatch(/required this\.nickname/); // が required は付かない
  });

  // Bug #2 Python: Optional/List/datetime を使うのに import が無い → NameError (generators.ts:507,511,537)
  it('Python: Optional を使うなら typing import がある', () => {
    const r = runEngine(WITH_NULLS, 'python', 'python', { rootName: 'Profile' });
    if (r.includes('Optional[')) expect(r).toMatch(/from typing import[^\n]*\bOptional\b/);
  });
  it('Python: List を使うなら typing import がある', () => {
    const r = runEngine(NESTED, 'python', 'python', { rootName: 'Project' });
    if (r.includes('List[')) expect(r).toMatch(/from typing import[^\n]*\bList\b/);
  });
  it('Python: datetime を使うなら datetime import がある', () => {
    const r = runEngine(WITH_DATETIME, 'python', 'python', { rootName: 'Event' });
    if (/:\s*datetime\b/.test(r)) expect(r).toMatch(/from datetime import\b/);
  });

  // Bug #3 GraphQL: null 値フィールド (nullable) に `!` がつく (generators.ts:643 が isNullable 未考慮)
  it('GraphQL: nullable フィールドに ! がつかない', () => {
    const r = runEngine(WITH_NULLS, 'graphql', 'graphql', { rootName: 'Profile' });
    expect(r).not.toMatch(/bio:\s*\w+!/);     // bio は null → nullable
    expect(r).not.toMatch(/website:\s*\w+!/); // website も null → nullable
  });

  // Bug #4 Pinia: update() が未定義の `XxxState` 型を参照する (generators-extended.ts:1400)
  it('Pinia: update() が参照する State 型は定義されている', () => {
    const r = runEngine(BASIC, 'pinia', 'pinia', { rootName: 'User' });
    const m = r.match(/Partial<(\w+)>/);
    if (m) expect(r).toMatch(new RegExp(`(interface|type)\\s+${m[1]}\\b`));
  });

  // Bug #5 Java: snake_case フィールドの getter/setter が camelCase 化されない (generators.ts:859)
  it('Java: getter/setter 名にアンダースコアが残らない', () => {
    const r = runEngine(WITH_NULLS, 'java', 'java', { rootName: 'Profile' });
    expect(r).not.toMatch(/\bget\w*_\w*\(/); // getUser_id() のような名前が無い
    expect(r).not.toMatch(/\bset\w*_\w*\(/);
  });
});

// ─── Phase 1 (2周目): Tier2 ジェネレータの確認済みバグ ───────────────────────
// union 型 = unionTypes に型名 ['string','number'] が入る（リテラル値ではない）。
const UNION_INPUT = [
  { id: 1, value: 'hello' },
  { id: 2, value: 42 },
];

describe('confirmed bug regressions (round 2)', () => {
  // Bug: joi/valibot/superstruct が union の型名をリテラル値として扱う
  it('Joi: union は型バリデータを使う（リテラルにしない）', () => {
    const r = runEngine(UNION_INPUT, 'joi', 'joi', { rootName: 'Row' });
    expect(r).toContain('Joi.alternatives()');
    expect(r).not.toMatch(/Joi\.valid\("(string|number|boolean)"\)/);
    expect(r).toContain('Joi.number()');
  });
  it('Valibot: union は型バリデータを使う（リテラルにしない）', () => {
    const r = runEngine(UNION_INPUT, 'valibot', 'valibot', { rootName: 'Row' });
    expect(r).not.toMatch(/v\.literal\("(string|number|boolean)"\)/);
    expect(r).toContain('v.number()');
  });
  it('Superstruct: union は型バリデータを使う（リテラルにしない）', () => {
    const r = runEngine(UNION_INPUT, 'superstruct', 'superstruct', { rootName: 'Row' });
    expect(r).not.toMatch(/s\.literal\("(string|number|boolean)"\)/);
    expect(r).toContain('s.number()');
  });

  // Bug: typeorm の enum 配列が TS union (` | `) を埋め込んでしまう
  it('TypeORM: enum 配列はカンマ区切り（| を含まない）', () => {
    const r = runEngine(WITH_ENUM, 'typeorm', 'typeorm', { rootName: 'Order' });
    if (r.includes("type: 'enum'")) {
      expect(r).not.toMatch(/enum: \[[^\]]*\|/); // 配列内に | が無い
    }
  });

  // Bug: mysql が型を見ずに id へ AUTO_INCREMENT を付ける
  it('MySQL: 文字列 id には AUTO_INCREMENT を付けない', () => {
    const r = runEngine(
      [{ id: 'abc-123', name: 'A' }, { id: 'def-456', name: 'B' }],
      'mysql', 'mysql', { rootName: 'Item' },
    );
    const idLine = r.split('\n').find((l: string) => /`id`/.test(l)) ?? '';
    expect(idLine).not.toContain('AUTO_INCREMENT');
  });
  it('MySQL: 数値 id には AUTO_INCREMENT を付ける（正常系の維持）', () => {
    const r = runEngine(
      [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      'mysql', 'mysql', { rootName: 'Item' },
    );
    const idLine = r.split('\n').find((l: string) => /`id`/.test(l)) ?? '';
    expect(idLine).toContain('AUTO_INCREMENT');
  });
});
