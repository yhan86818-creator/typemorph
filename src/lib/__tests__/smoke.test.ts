/**
 * スモークテスト: 全フォーマット × 代表入力を runEngine に流し、機械的に検証する。
 *
 * 目的: 「実装したのに出力がゴミ/クラッシュする」ジェネレータを人手を介さず検出する。
 * チェック内容:
 *   1. 例外を投げない（クラッシュ検出）
 *   2. 文字列を返す（型崩れ検出）
 *   3. 明らかなゴミトークンを含まない（[object Object] / NaN / undefined 埋め込み等）
 */

import { describe, it, expect } from 'vitest';
import { runEngine } from '../engine';
import { converters } from '../../data/converters';

// ─── 代表入力パターン ────────────────────────────────────────────────────────
const INPUTS: Record<string, unknown> = {
  basic: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice', age: 30, active: true },
  nulls: { user_id: 'u1', bio: null, website: null, follower_count: 12, is_verified: false },
  nested: { project: 'TM', owner: { id: 'u9', name: 'K' }, tags: ['a', 'b'] },
  enumArr: [
    { order_id: 'o1', status: 'pending', amount: 100 },
    { order_id: 'o2', status: 'shipped', amount: 50 },
    { order_id: 'o3', status: 'pending', amount: 80 },
  ],
  arrayRoot: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
  union: [{ id: 1, value: 'x' }, { id: 2, value: 99 }],
  empty: {},
};

// 明らかな生成ミスを示すゴミトークンのみ（言語固有の正当表現で誤検知しないもの）。
// 注意: 単独の `undefined` は TS の `string | undefined` 型で正当、`${...}` は
// テンプレートリテラルで正当、`>>` は C++ ジェネリクスで正当なため除外している。
const GARBAGE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\[object Object\]/, label: '[object Object]' },     // オブジェクトの文字列化ミス
  { re: /\bNaN\b/, label: 'NaN' },                           // 数値計算ミス
  { re: /undefinedundefined|undefinednull|nullundefined/, label: 'token 連結ミス' },
  { re: /:\s*,|,\s*,|\(\s*,/, label: '空の値/引数' },         // フィールド値や引数の欠落
];

// 全スラッグ（converters.ts）+ engine が直接受ける言語キー
const SLUGS = Array.from(new Set(converters.map(c => c.slug)));

describe('smoke: 全フォーマット × 代表入力でクラッシュ/ゴミ出力がない', () => {
  for (const slug of SLUGS) {
    for (const [inputName, input] of Object.entries(INPUTS)) {
      it(`${slug} / ${inputName}`, () => {
        let out: string;
        try {
          out = runEngine(input, slug, slug, { rootName: 'Root' });
        } catch (e) {
          throw new Error(`runEngine が例外を投げた: ${(e as Error).message}`);
        }
        expect(typeof out).toBe('string');

        // 空入力は空出力が正当なのでゴミチェックをスキップ
        if (inputName === 'empty') return;

        for (const { re, label } of GARBAGE_PATTERNS) {
          if (re.test(out)) {
            throw new Error(`ゴミトークン "${label}" を含む出力:\n${out.slice(0, 400)}`);
          }
        }
      });
    }
  }
});
