// ── Types ────────────────────────────────────────────────────────────────────
export type { SchemaType, Schema, Converter, ASTClass, ASTField, ASTType, ASTTypeKind } from '../../../src/lib/types';

// ── Engine ───────────────────────────────────────────────────────────────────
export type { InferOptions, Decision } from '../../../src/lib/engine';
export {
  runEngine,
  inferSchema,
  inferSchemaAsync,
  getDecisions,
  parseYAML,
  parseXML,
  parseCurl,
  parseEnvFile,
} from '../../../src/lib/engine';

// ── Parsers ──────────────────────────────────────────────────────────────────
export { isOpenAPISpec, parseOpenAPIComponents } from '../../../src/lib/openapi-parser';
export { isJSONSchema, parseJSONSchema }         from '../../../src/lib/jsonschema-parser';

// ── Quality ──────────────────────────────────────────────────────────────────
export type { QualityIssue, QualityResult } from '../../../src/lib/quality';
export { analyzeQuality }                    from '../../../src/lib/quality';

// ── Diff ─────────────────────────────────────────────────────────────────────
export type { SchemaDiff }                        from '../../../src/lib/diff';
export { compareSchemaTypes, compareSchemas }     from '../../../src/lib/diff';

// ── Reverse ──────────────────────────────────────────────────────────────────
export { generateSampleJson } from '../../../src/lib/reverse';

// ── Targets ──────────────────────────────────────────────────────────────────
export type { OutputTarget, TargetTier }                              from '../../../src/lib/targets';
export { OUTPUT_TARGETS, resolveSlugTarget, monacoLanguageForTarget } from '../../../src/lib/targets';
