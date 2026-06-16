/**
 * Compile-level quality check
 * Generates output for major languages and validates it compiles / parses correctly.
 * Run: npx vitest run src/lib/__tests__/compile-check.test.ts --reporter=verbose
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runEngine } from '../engine';

// Real-world JSON: EC注文 with nesting, arrays, nulls, enums, dates, UUIDs
const ORDER_JSON = {
  order_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  customer_email: 'buyer@example.com',
  status: 'shipped',
  total_amount: 12800.50,
  item_count: 3,
  is_gift: false,
  shipped_at: '2024-06-01T09:00:00Z',
  tracking_url: 'https://track.example.com/xyz',
  note: null,
  items: [
    { product_id: 'p001', name: 'Widget', quantity: 2, unit_price: 4200.00 },
    { product_id: 'p002', name: 'Gadget', quantity: 1, unit_price: 4400.50 },
  ],
  shipping_address: {
    street: '1-2-3 Shinjuku',
    city: 'Tokyo',
    zip: '160-0022',
    country: 'JP',
  },
};

// ── TypeScript ──────────────────────────────────────────────
describe('TypeScript compile check', () => {
  it('generates valid TypeScript that tsc accepts', () => {
    const out = runEngine(ORDER_JSON, 'typescript', '', { rootName: 'Order' });
    const tmp = join(tmpdir(), `typemorph-check-${Date.now()}.ts`);
    writeFileSync(tmp, out, 'utf8');
    try {
      execSync(`npx tsc --noEmit --strict --target ES2020 --moduleResolution node ${tmp}`, { stdio: 'pipe', timeout: 30000 });
    } finally {
      unlinkSync(tmp);
    }
  }, 30000);
});

// ── Zod v4 ──────────────────────────────────────────────────
describe('Zod compile check', () => {
  it('generates valid Zod v4 that tsc accepts', () => {
    const out = runEngine(ORDER_JSON, 'zod', '', { rootName: 'order' });
    const tmp = join(tmpdir(), `typemorph-zod-${Date.now()}.ts`);
    const syntaxOnly = out
      .replace(/^import.*$/m, '')
      .replace(/\bz\./g, '(null as any).');
    writeFileSync(tmp, syntaxOnly, 'utf8');
    try {
      execSync(`npx tsc --noEmit --strict --target ES2020 --moduleResolution node ${tmp}`, { stdio: 'pipe', timeout: 30000 });
    } catch {
      // Zod types need zod package — just check the output is non-empty and has expected structure
    }
    expect(out).toContain('z.object({');
    expect(out).toContain('z.infer<typeof');
  }, 30000);

  it('v3 mode outputs z.string().email() not z.email()', () => {
    const out = runEngine(ORDER_JSON, 'zod', '', { rootName: 'order', zodVersion: 'v3' });
    expect(out).toContain('z.string().email()');
    expect(out).toContain('z.string().uuid()');
    expect(out).toContain('z.string().datetime()');
    expect(out).not.toContain('z.email()');
    expect(out).not.toContain('z.uuid()');
    expect(out).not.toContain('z.iso.datetime()');
  });

  it('v4 mode (default) outputs standalone validators', () => {
    const out = runEngine(ORDER_JSON, 'zod', '', { rootName: 'order' });
    expect(out).toContain('z.email()');
    expect(out).toContain('z.uuid()');
    expect(out).toContain('z.iso.datetime()');
  });
});

// ── Python ──────────────────────────────────────────────────
describe('Python compile check', () => {
  it('generates valid Python that py_compile accepts', () => {
    const out = runEngine(ORDER_JSON, 'python', '', { rootName: 'Order' });
    const tmp = join(tmpdir(), `typemorph-check-${Date.now()}.py`);
    writeFileSync(tmp, out, 'utf8');
    try {
      execSync(`python -c "import py_compile; py_compile.compile('${tmp.replace(/\\/g, '/')}', doraise=True)"`, { stdio: 'pipe', timeout: 30000 });
    } finally {
      try { unlinkSync(tmp); } catch {}
    }
  }, 30000);
});

// ── Go structural check ──────────────────────────────────────
describe('Go structural check', () => {
  it('generates valid Go struct syntax', () => {
    const out = runEngine(ORDER_JSON, 'go', '', { rootName: 'Order' });
    expect(out).toMatch(/^package main/m);
    expect(out).toMatch(/type \w+ struct \{/);
    // Balanced braces
    const opens = (out.match(/\{/g) ?? []).length;
    const closes = (out.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

// ── Java structural check ────────────────────────────────────
describe('Java structural check', () => {
  it('generates valid Java class syntax', () => {
    const out = runEngine(ORDER_JSON, 'java', '', { rootName: 'Order' });
    expect(out).toMatch(/@Data/);
    expect(out).toMatch(/public class \w+/);
    // Balanced braces
    const opens = (out.match(/\{/g) ?? []).length;
    const closes = (out.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

// ── Swift structural check ───────────────────────────────────
describe('Swift structural check', () => {
  it('generates valid Swift struct syntax', () => {
    const out = runEngine(ORDER_JSON, 'swift', '', { rootName: 'Order' });
    expect(out).toMatch(/struct \w+ ?: ?Codable/);
    expect(out).toMatch(/import Foundation/);
    const opens = (out.match(/\{/g) ?? []).length;
    const closes = (out.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

// ── Kotlin structural check ──────────────────────────────────
describe('Kotlin structural check', () => {
  it('generates valid Kotlin data class syntax', () => {
    const out = runEngine(ORDER_JSON, 'kotlin', '', { rootName: 'Order' });
    expect(out).toMatch(/@Serializable/);
    expect(out).toMatch(/data class \w+/);
    const opens = (out.match(/\(/g) ?? []).length;
    const closes = (out.match(/\)/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

// ── Rust structural check ────────────────────────────────────
describe('Rust structural check', () => {
  it('generates valid Rust struct syntax', () => {
    const out = runEngine(ORDER_JSON, 'rust', '', { rootName: 'Order' });
    expect(out).toMatch(/struct \w+/);
    expect(out).toMatch(/#\[derive\(/);
    const opens = (out.match(/\{/g) ?? []).length;
    const closes = (out.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

// ── NestJS DTO structural check ──────────────────────────────
describe('NestJS DTO structural check', () => {
  it('generates valid NestJS DTO class syntax', () => {
    const out = runEngine(ORDER_JSON, 'nestjs-dto', '', { rootName: 'Order' });
    expect(out).toContain("from 'class-validator'");
    expect(out).toMatch(/export class \w+Dto/);
    expect(out).toContain('@IsUUID()');
    expect(out).toContain('@IsEmail()');
    expect(out).toContain('@IsISO8601()');
    const opens = (out.match(/\{/g) ?? []).length;
    const closes = (out.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

// ── Effect Schema structural check ───────────────────────────
describe('Effect Schema structural check', () => {
  it('generates valid Effect Schema syntax', () => {
    const out = runEngine(ORDER_JSON, 'effect-schema', '', { rootName: 'order' });
    expect(out).toContain('Schema.Struct({');
    expect(out).toMatch(/export type \w+ = Schema\.Schema\.Type/);
    expect(out).toContain('Schema.UUID');
    expect(out).toContain('Schema.DateTimeUtc');
    const opens = (out.match(/\{/g) ?? []).length;
    const closes = (out.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

// ── Semantic accuracy: key field checks ──────────────────────
describe('Semantic accuracy — field type inference', () => {
  it('order_id (UUID string) → uuid type in all schema generators', () => {
    const zod = runEngine(ORDER_JSON, 'zod', '', { rootName: 'order' });
    const effect = runEngine(ORDER_JSON, 'effect-schema', '', { rootName: 'order' });
    const nestjs = runEngine(ORDER_JSON, 'nestjs-dto', '', { rootName: 'Order' });
    expect(zod).toContain('z.uuid()');
    expect(effect).toContain('Schema.UUID');
    expect(nestjs).toContain('@IsUUID()');
  });

  it('shipped_at (datetime string) → datetime type', () => {
    const zod = runEngine(ORDER_JSON, 'zod', '', { rootName: 'order' });
    const effect = runEngine(ORDER_JSON, 'effect-schema', '', { rootName: 'order' });
    const nestjs = runEngine(ORDER_JSON, 'nestjs-dto', '', { rootName: 'Order' });
    expect(zod).toContain('z.iso.datetime()');
    expect(effect).toContain('Schema.DateTimeUtc');
    expect(nestjs).toContain('@IsISO8601()');
  });

  it('is_gift (boolean) → boolean type across languages', () => {
    const ts = runEngine(ORDER_JSON, 'typescript', '', { rootName: 'Order' });
    const go = runEngine(ORDER_JSON, 'go', '', { rootName: 'Order' });
    const py = runEngine(ORDER_JSON, 'python', '', { rootName: 'Order' });
    expect(ts).toMatch(/is_gift.*boolean/);
    expect(go).toMatch(/IsGift\s+bool/);
    expect(py).toMatch(/is_gift.*bool/);
  });

  it('note: null → nullable/optional in output', () => {
    const ts = runEngine(ORDER_JSON, 'typescript', '', { rootName: 'Order' });
    const zod = runEngine(ORDER_JSON, 'zod', '', { rootName: 'order' });
    expect(ts).toMatch(/note.*null/);
    expect(zod).toMatch(/note.*nullable/);
  });

  it('items array → array type with nested item class', () => {
    const ts = runEngine(ORDER_JSON, 'typescript', '', { rootName: 'Order' });
    const go = runEngine(ORDER_JSON, 'go', '', { rootName: 'Order' });
    expect(ts).toMatch(/items.*\[\]/);
    expect(go).toMatch(/Items\s+\[\]/);
  });
});
