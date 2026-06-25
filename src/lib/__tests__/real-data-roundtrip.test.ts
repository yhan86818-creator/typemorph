import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as ts from 'typescript';
import { describe, it, expect } from 'vitest';

import { runEngine } from '../engine';

// Regression gate for the self-consistency invariant: a generated Zod schema MUST accept
// the very real-world JSON it was inferred from. These fixtures are trimmed real API
// responses (github / jsonplaceholder / pokeapi / randomuser / swapi / usgs / open-meteo)
// that each previously produced a false-negative schema (over-strict format, dropped data
// key, hyphenated identifier, …). See project_typemorph_self_consistency.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'real-data');

let tmpN = 0;
async function loadZodRoot(zodSrc: string): Promise<any> {
  const js = ts.transpileModule(zodSrc, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  // Temp module must live inside the project so vitest can resolve the dynamic import.
  const file = path.join(__dirname, `.tmp_realdata_${process.pid}_${tmpN++}.mjs`);
  fs.writeFileSync(file, js, 'utf8');
  try {
    const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
    return mod.rootSchema || mod.Root || mod.default;
  } finally {
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }
}

const fixtures = fs.existsSync(FIXTURE_DIR)
  ? fs.readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.json'))
  : [];

describe('real-data round-trip: generated Zod accepts its own source JSON', () => {
  it('has fixtures to test', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const file of fixtures) {
    it(`${file} → zod schema safeParses the original data`, async () => {
      const json = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8'));
      const code = runEngine(json, 'zod', '', { rootName: 'Root' });

      // 1. Must be syntactically valid TS/Zod.
      expect(() => ts.transpileModule(code, {
        compilerOptions: { noEmitOnError: true, target: ts.ScriptTarget.ES2020 },
      })).not.toThrow();

      // 2. The schema must accept the data it was generated from (no false negatives).
      const schema = await loadZodRoot(code);
      expect(schema, 'no rootSchema export found in generated code').toBeTruthy();
      const res = schema.safeParse(json);
      expect(
        res.success,
        res.success ? '' : `schema rejected its own data: ${JSON.stringify(res.error.issues.slice(0, 3))}`,
      ).toBe(true);
    });
  }
});
