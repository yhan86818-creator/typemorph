/**
 * Logic Accuracy Tests
 * --------------------
 * 「フォーマット検出・型マッピング・フィールド反映」の正確性を検証する。
 * キーワード存在チェックではなく、具体的な入力→出力の対応が正しいかを見る。
 */

import { describe, it, expect } from 'vitest';
import { inferSchema, runEngine } from '../engine';

// ─── 入力: 典型的なAPIレスポンス ────────────────────────────────────────────
const SAMPLE = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 42,          // integer foreign key
  orderId: 99,         // integer foreign key
  name: 'Alice',
  email: 'alice@example.com',
  age: 28,
  score: 4.5,
  is_active: true,
  created_at: '2024-01-01T10:00:00Z',
  tags: ['ts', 'node'],
  address: { city: 'Tokyo', zip: '100-0001' },
  status: 'active',
};

const run = (key: string) => runEngine(SAMPLE, key, '', { rootName: 'User' });

// ─── inferSchema: フォーマット検出の境界値 ────────────────────────────────────

describe('inferSchema: date vs datetime detection', () => {
  it('YYYY-MM-DD → format: date', () => {
    const s = inferSchema({ d: '2024-01-15' });
    expect(s.fields!.d.format).toBe('date');
  });

  it('YYYY/MM/DD → format: date (not datetime)', () => {
    // Bug: no $ anchor would classify this as datetime
    const s = inferSchema({ d: '2024/01/15' });
    expect(s.fields!.d.format).toBe('date');
  });

  it('YYYY-MM-DDTHH:MM:SSZ → format: datetime', () => {
    const s = inferSchema({ d: '2024-01-15T10:30:00Z' });
    expect(s.fields!.d.format).toBe('datetime');
  });

  it('YYYY-MM-DD HH:MM:SS → format: datetime (space separator)', () => {
    const s = inferSchema({ d: '2024-01-15 10:30:00' });
    expect(s.fields!.d.format).toBe('datetime');
  });

  it('YYYY/MM/DD HH:MM → format: datetime (slash + space)', () => {
    const s = inferSchema({ d: '2024/01/15 10:30' });
    expect(s.fields!.d.format).toBe('datetime');
  });

  it('random string starting with 4 digits is NOT a date', () => {
    const s = inferSchema({ d: '2024 album title' });
    expect(s.fields!.d.format).toBeUndefined();
    expect(s.fields!.d.type).toBe('string');
  });
});

describe('inferSchema: type accuracy', () => {
  it('integer value → format: int', () => {
    const s = inferSchema({ count: 5 });
    expect(s.fields!.count.type).toBe('number');
    expect(s.fields!.count.format).toBe('int');
  });

  it('float value → format: float', () => {
    const s = inferSchema({ score: 4.5 });
    expect(s.fields!.score.type).toBe('number');
    expect(s.fields!.score.format).toBe('float');
  });

  it('boolean value → type: boolean', () => {
    const s = inferSchema({ active: true });
    expect(s.fields!.active.type).toBe('boolean');
  });

  it('null value → nullable any', () => {
    const s = inferSchema({ x: null });
    expect(s.fields!.x.nullable).toBe(true);
  });

  it('array of mixed types in same field → union', () => {
    const s = inferSchema([
      { val: 'hello' },
      { val: 42 },
    ]);
    expect(s.itemType!.fields!.val.type).toBe('union');
    expect(s.itemType!.fields!.val.unionTypes).toContain('string');
    expect(s.itemType!.fields!.val.unionTypes).toContain('number');
  });

  it('field missing in some array items → optional', () => {
    const s = inferSchema([{ name: 'Alice' }, { name: 'Bob', age: 30 }]);
    expect(s.itemType!.fields!.age.optional).toBe(true);
    expect(s.itemType!.fields!.name.optional).toBeFalsy();
  });
});

describe('inferSchema: enum detection edge cases', () => {
  it('status keyword with known value in array → enum', () => {
    const s = inferSchema([
      { status: 'active' },
      { status: 'inactive' },
      { status: 'pending' },
    ]);
    expect(s.itemType!.fields!.status.enumValues).toContain('active');
  });

  it('7-value enum exceeds cap → becomes plain string', () => {
    const s = inferSchema([
      { color: 'red' }, { color: 'blue' }, { color: 'green' },
      { color: 'yellow' }, { color: 'purple' }, { color: 'orange' }, { color: 'pink' },
    ]);
    // mergeSchemas caps enum at 6 unique values; 7 → plain string
    expect(s.itemType!.fields!.color.enumValues).toBeUndefined();
    expect(s.itemType!.fields!.color.type).toBe('string');
  });

  it('free-text field should NOT become enum', () => {
    const s = inferSchema({ description: 'This is a long description of the product.' });
    expect(s.fields!.description.enumValues).toBeUndefined();
  });
});

// ─── drizzle: 型マッピング正確性 ────────────────────────────────────────────

describe('drizzle: type fidelity', () => {
  it('id (UUID string) → uuid().primaryKey()', () => {
    const o = run('drizzle');
    expect(o).toContain(`uuid('id').defaultRandom().primaryKey()`);
  });

  it('userId: 42 (integer FK) → integer(), NOT uuid()', () => {
    // Bug was: endsWith('id') always used uuid regardless of v.type
    const o = run('drizzle');
    expect(o).toMatch(/userId.*integer|integer.*userId/);
    expect(o).not.toMatch(/userId.*uuid\(|uuid\(.*user_id.*primaryKey/);
  });

  it('orderId: 99 (integer FK) → integer()', () => {
    const o = run('drizzle');
    expect(o).toMatch(/orderId.*integer|integer.*order_id/);
  });

  it('score: 4.5 (float) → real()', () => {
    const o = run('drizzle');
    expect(o).toMatch(/score.*real\(|real\(.*score/);
  });

  it('age: 28 (integer) → integer()', () => {
    const o = run('drizzle');
    expect(o).toMatch(/age.*integer\(|integer\(.*age/);
  });

  it('is_active: true (boolean) → boolean()', () => {
    const o = run('drizzle');
    expect(o).toMatch(/is_active.*boolean\(|boolean\(.*is_active/);
  });

  it('email → varchar with .unique()', () => {
    const o = run('drizzle');
    expect(o).toMatch(/email.*varchar|varchar.*email/);
    expect(o).toContain('.unique()');
  });

  it('created_at → timestamp with .defaultNow()', () => {
    const o = run('drizzle');
    expect(o).toMatch(/created_at.*timestamp|timestamp.*created_at/);
    expect(o).toContain('.defaultNow()');
  });
});

// ─── SQL generators: フィールド名 + 型が出力に反映されているか ────────────────

describe('mysql: field names and types', () => {
  it('all input fields appear in output', () => {
    const o = run('mysql');
    for (const field of ['name', 'email', 'age', 'is_active', 'score', 'status']) {
      expect(o.toLowerCase()).toContain(field.toLowerCase());
    }
  });

  it('age (integer) → BIGINT not VARCHAR', () => {
    const o = run('mysql');
    expect(o).toMatch(/`age`\s+BIGINT/i);
  });

  it('is_active (boolean) → TINYINT(1)', () => {
    const o = run('mysql');
    expect(o).toMatch(/`is_active`\s+TINYINT/i);
  });

  it('email (email format) → VARCHAR(255)', () => {
    const o = run('mysql');
    expect(o).toMatch(/`email`\s+VARCHAR\(255\)/i);
  });
});

describe('postgres: field names and types', () => {
  it('all input fields appear in output', () => {
    const o = run('postgres');
    for (const field of ['name', 'email', 'age', 'is_active', 'score', 'status']) {
      expect(o.toLowerCase()).toContain(field.toLowerCase());
    }
  });

  it('age (integer) → BIGINT not VARCHAR', () => {
    const o = run('postgres');
    expect(o).toMatch(/"age"\s+BIGINT/i);
  });

  it('is_active (boolean) → BOOLEAN', () => {
    const o = run('postgres');
    expect(o).toMatch(/"is_active"\s+BOOLEAN/i);
  });

  it('id (UUID string) → UUID type', () => {
    const o = run('postgres');
    expect(o).toMatch(/"id"\s+UUID/i);
  });
});

// ─── Validation libraries: フィールド型が正しく出力されるか ─────────────────

describe('zod: field type fidelity', () => {
  const o = run('zod');

  it('age (integer) → z.number()', () => {
    expect(o).toMatch(/age.*z\.number|z\.number.*age/);
  });

  it('is_active (boolean) → z.boolean()', () => {
    expect(o).toMatch(/is_active.*z\.boolean|z\.boolean.*is_active/);
  });

  it('email (email format) → z.email() or .email()', () => {
    expect(o).toMatch(/z\.email\(\)|\.email\(\)/);
  });
});

describe('yup: field type fidelity', () => {
  const o = run('yup');

  it('age → yup.number()', () => {
    expect(o).toMatch(/age.*yup\.number|yup\.number.*age/);
  });

  it('is_active → yup.boolean()', () => {
    expect(o).toMatch(/is_active.*yup\.boolean|yup\.boolean.*is_active/);
  });
});

describe('valibot: field type fidelity', () => {
  const o = run('valibot');

  it('age → v.number()', () => {
    expect(o).toMatch(/age.*v\.number|v\.number.*age/);
  });

  it('is_active → v.boolean()', () => {
    expect(o).toMatch(/is_active.*v\.boolean|v\.boolean.*is_active/);
  });
});

// ─── Mongoose: フィールド型の正確性 ─────────────────────────────────────────

describe('mongoose: field type fidelity', () => {
  const o = run('mongoose');

  it('age (number) → type: Number', () => {
    expect(o).toMatch(/age.*Number|Number.*age/);
  });

  it('is_active (boolean) → type: Boolean', () => {
    expect(o).toMatch(/is_active.*Boolean|Boolean.*is_active/);
  });

  it('name (string) → type: String', () => {
    expect(o).toMatch(/name.*String|String.*name/);
  });
});

// ─── TypeScript generator: 全フィールドが出力に現れるか ────────────────────

describe('typescript: all fields present', () => {
  const o = run('typescript');

  it('every input field appears in interface', () => {
    for (const field of ['id', 'name', 'email', 'age', 'is_active', 'score', 'created_at', 'tags', 'status']) {
      expect(o).toContain(field);
    }
  });

  it('age → number', () => {
    expect(o).toMatch(/age\??:\s*number/);
  });

  it('is_active → boolean', () => {
    expect(o).toMatch(/is_active\??:\s*boolean/);
  });
});

// ─── Django: モデルフィールドの型 ────────────────────────────────────────────

describe('django: field type fidelity', () => {
  const o = run('django');

  it('age (integer) → IntegerField not CharField', () => {
    expect(o).toMatch(/age.*IntegerField|IntegerField.*age/);
    expect(o).not.toMatch(/age.*CharField/);
  });

  it('is_active (boolean) → BooleanField', () => {
    expect(o).toMatch(/is_active.*BooleanField|BooleanField.*is_active/);
  });

  it('email (email format) → EmailField', () => {
    expect(o).toMatch(/email.*EmailField|EmailField.*email/);
  });
});
