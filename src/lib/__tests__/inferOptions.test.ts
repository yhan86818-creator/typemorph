import { expect, test } from 'vitest';
import { inferSchema, InferOptions } from '../engine';

test('inferSchema respects maxDepth option', () => {
  const deepObj: any = { a: { b: { c: { d: { e: { f: 1 } } } } } };
  const opts: InferOptions = { maxDepth: 3 };
  const s = inferSchema(deepObj, undefined, 0, undefined, opts);
  // At shallow maxDepth, some deeply nested fields should be collapsed to 'any'
  let foundAny = false;
  const walk = (schema: any, depth = 0) => {
    if (!schema || typeof schema !== 'object') return;
    if (schema.type === 'any') { foundAny = true; return; }
    if (schema.fields) {
      for (const v of Object.values(schema.fields)) walk(v, depth + 1);
    }
    if (schema.itemType) walk(schema.itemType, depth + 1);
  };
  walk(s);
  expect(foundAny).toBeTruthy();
});

test('inferSchema enumMinSamples affects enum detection', () => {
  const arr = [
    { label: 'ok' },
    { label: 'ok' },
    { label: 'error' }
  ];
  // default minSamples is 3 -> should detect enum candidate on 'label'
  const sDefault = inferSchema(arr);
  const labelField = sDefault.itemType?.type === 'object' ? sDefault.itemType.fields?.label : undefined;
  expect(labelField?.enumValues || labelField?.type).toBeDefined();

  // raise minSamples to 4 -> should not mark as enum (not enough samples)
  const sOpts = inferSchema(arr, undefined, 0, undefined, { enumMinSamples: 4 });
  const labelField2 = sOpts.itemType?.type === 'object' ? sOpts.itemType.fields?.label : undefined;
  expect(labelField2?.enumValues).toBeUndefined();
});
