import fs from 'fs';
import path from 'path';
import { describe, it } from 'vitest';
import { inferSchema, InferOptions } from '../engine';

const samplesDir = path.join(__dirname, 'samples');
const sampleFiles = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json'));

const optionsList: { name: string; opts?: InferOptions }[] = [
  { name: 'default', opts: undefined },
  { name: 'shallow_max3', opts: { maxDepth: 3 } },
  { name: 'enum_min4', opts: { enumMinSamples: 4 } },
  { name: 'deep_max20_enum6', opts: { maxDepth: 20, enumMinSamples: 3, enumMaxUnique: 6 } },
  { name: 'include_meta', opts: { includeMeta: true } }
];

const traverse = (s: any, counters: { fields: number; anyCount: number; enumCount: number }) => {
  if (!s || typeof s !== 'object') return;
  if (s.type) {
    counters.fields += 1;
    if (s.type === 'any') counters.anyCount += 1;
    if (s.enumValues && Array.isArray(s.enumValues) && s.enumValues.length > 0) counters.enumCount += 1;
  }
  if (s.fields) {
    for (const v of Object.values(s.fields)) traverse(v, counters);
  }
  if (s.itemType) traverse(s.itemType, counters);
};

describe('InferSchema benchmarks', () => {
  it('runs inference across samples and options and writes bench-results.json', async () => {
    const results: any = {};
    for (const sf of sampleFiles) {
      const p = path.join(samplesDir, sf);
      const raw = fs.readFileSync(p, 'utf8');
      const json = JSON.parse(raw);
      results[sf] = {};
      for (const opt of optionsList) {
        const start = Date.now();
        const schema = inferSchema(json, undefined, 0, undefined, opt.opts);
        const duration = Date.now() - start;

        const counters = { fields: 0, anyCount: 0, enumCount: 0 };
        traverse(schema, counters);

        results[sf][opt.name] = {
          durationMs: duration,
          fields: counters.fields,
          anyCount: counters.anyCount,
          enumCount: counters.enumCount
        };
      }
    }
    const outPath = path.join(process.cwd(), 'bench-results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log('Wrote bench results to', outPath);
  });
});
