export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' | 'union';

export interface Schema {
  type: SchemaType;
  format?: 'email' | 'url' | 'uuid' | 'datetime' | 'date' | 'int' | 'float' | 'text' | 'color' | 'ip';
  fields?: Record<string, Schema>;
  itemType?: Schema;
  /** True when this field was absent in at least one sample object during inference */
  optional?: boolean;
  /** True when the value was explicitly null in at least one sample */
  nullable?: boolean;
  /**
   * Inferred numeric distribution from sample data, used by validateOutputs for
   * conservative sign/outlier checks (warning-level only). Not used for codegen.
   */
  numericStats?: { allNonNegative: boolean; max: number };
  /**
   * Set when a string field's sampled values are all valid ISO-4217 currency
   * codes → validateOutputs warns on values outside the ISO dictionary (e.g. "US$").
   */
  isCurrencyCode?: boolean;
  /**
   * Set when a string field appears to have a closed set of specific literal values.
   * e.g. ["active", "inactive", "pending"]
   */
  enumValues?: string[];
  /**
   * Set when multiple incompatible primitive types were observed for the same field.
   * e.g. ["string", "number"] → rendered as `string | number` in TypeScript.
   * When set, `type` is "union".
   */
  unionTypes?: string[];
  /**
   * Set when an object's keys look dynamic (numeric / uuid / shared-prefix+number)
   * rather than a fixed schema → rendered as a map (e.g. z.record(z.string(), V)).
   * `type` stays "object" so generators without record support degrade gracefully.
   */
  recordValueType?: Schema;
  /**
   * Set when a short array holds heterogeneously-typed positional elements
   * (e.g. ["lat", 35.6] → [string, number]) → rendered as a fixed-length tuple.
   * `type` stays "array" so generators without tuple support degrade gracefully.
   */
  tupleTypes?: Schema[];
  /**
   * Raw Zod refinement/constraint method calls captured verbatim from a parsed Zod
   * schema (e.g. [".min(0)", ".max(120)", ".regex(/^a$/)"]). Re-emitted as-is so the
   * round-trip (paste Zod → convert) never silently drops constraints (R4).
   */
  refinements?: string[];
  /**
   * Literal value captured from a parsed `z.literal(...)`. `type` holds the base
   * type (string/number/boolean) so non-Zod generators degrade to that base, while
   * the Zod generator re-emits `z.literal(value)` instead of silently widening.
   */
  literalValue?: string | number | boolean;
  /**
   * Set when the source used `z.coerce.<type>()`. The Zod generator re-emits the
   * coercion; other generators ignore it and use the base `type`.
   */
  coerced?: boolean;
  /**
   * Verbatim Zod expression to re-emit on the Zod path when the type can't be
   * represented structurally (e.g. an unresolvable `z.nativeEnum(Role)` whose enum
   * lives in another file). Non-Zod generators ignore it and fall back to `type`.
   */
  rawZodType?: string;
  _structureHash?: string;
  _sharedTypeName?: string;
  /** Optional runtime metadata produced by the inference engine (when enabled) */
  _meta?: Record<string, any>;
  /** Field name used as discriminator when array items form a discriminated union */
  discriminatorField?: string;
  /** Per-discriminator-value schemas when a discriminated union was detected */
  discriminatedVariants?: Record<string, Schema>;
}

export interface Converter {
  slug: string;
  title: string;
  description: string;
  h1?: string;
}

// ---------------------------------------------------------------------------
// TypeMorph-AST (Language-Agnostic Abstract Syntax Tree)
// ---------------------------------------------------------------------------
export interface ASTClass {
  name: string;
  fields: ASTField[];
  annotations?: string[];
  docComment?: string;
  isShared?: boolean;
}

export interface ASTField {
  name: string;
  fieldType: ASTType;
  isOptional: boolean;
  isNullable: boolean;
  annotations?: string[];
  docComment?: string;
}

export type ASTTypeKind = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'any' | 'classRef' | 'array' | 'union' | 'enum' | 'record' | 'tuple';

export interface ASTType {
  kind: ASTTypeKind;
  classRefName?: string;         // Used when kind is 'classRef'
  itemType?: ASTType;            // Used when kind is 'array'
  unionTypes?: ASTTypeKind[];    // Used when kind is 'union'
  enumValues?: string[];         // Used when kind is 'enum'
  recordValueType?: ASTType;     // Used when kind is 'record' (key is always string)
  tupleTypes?: ASTType[];        // Used when kind is 'tuple'
  refinements?: string[];        // Raw Zod constraint suffixes preserved for round-trip (R4)
  literalValue?: string | number | boolean; // Set from z.literal(...) — Zod path re-emits z.literal()
  coerced?: boolean;             // Set from z.coerce.<type>() — Zod path re-emits z.coerce
  rawZodType?: string;           // Verbatim Zod expr (unresolvable z.nativeEnum) — Zod path re-emits as-is
  format?: 'email' | 'url' | 'uuid' | 'datetime' | 'date' | 'int' | 'float' | 'text' | 'color' | 'ip'; // matches Schema.format
}
