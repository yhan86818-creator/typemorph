import { describe, it, expect } from 'vitest';
import { runEngine } from '../engine';
import { OUTPUT_TARGETS } from '../targets';

// 代表的なスキーマ。配列ルートと単一オブジェクトルートの両方で、
// すべての公開ターゲットが「空でも未対応でもエラーでもない」出力を返すことを保証する。
const arrayRoot = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    active: true,
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    profile: { city: 'Tokyo', zip: '100-0001' },
    tags: ['a', 'b'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Bob',
    email: 'bob@example.com',
    age: 25,
    active: false,
    role: 'user',
    created_at: '2024-02-01T00:00:00Z',
    profile: { city: 'Osaka', zip: '530-0001' },
    tags: ['c'],
  },
];
const objectRoot = arrayRoot[0];

// コメント行（各言語の依存コメント / 注釈）を除いた実体が残るかを判定するためのヘルパー。
const stripComments = (out: string): string =>
  out
    .replace(/^([ \t]*(\/\/|#|--|;;|\*)[^\n]*\n?)/gm, '')
    .trim();

const targetKeys = Object.keys(OUTPUT_TARGETS);

describe('every exposed output target produces real output', () => {
  for (const key of targetKeys) {
    for (const [label, input] of [['array', arrayRoot], ['object', objectRoot]] as const) {
      it(`${key} (${label} root) is non-empty, supported, and error-free`, () => {
        const out = runEngine(input, key, key, { rootName: 'User' });
        expect(out.startsWith('// Error:'), `engine threw: ${out}`).toBe(false);
        expect(out.includes('Unsupported output target'), 'routed to unsupported').toBe(false);
        expect(out.includes('No output generated'), 'generator returned empty').toBe(false);
        expect(stripComments(out).length, 'body is empty after stripping comments').toBeGreaterThan(0);
      });
    }
  }

  // asciidoc が doc に吸われていた回帰（ルーター前方一致衝突）を固定する。
  it('asciidoc routes to the AsciiDoc table generator, not docGen', () => {
    const asciidoc = runEngine(objectRoot, 'asciidoc', 'asciidoc', { rootName: 'User' });
    const doc = runEngine(objectRoot, 'doc', 'doc', { rootName: 'User' });
    expect(asciidoc).toContain('[cols=');
    expect(asciidoc).toContain('|===');
    expect(asciidoc).not.toBe(doc);
  });
});
