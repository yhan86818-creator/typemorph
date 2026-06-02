export interface Schema {
  type: string;
  format?: 'email' | 'url' | 'uuid' | 'datetime' | 'date' | 'int' | 'float';
  fields?: Record<string, Schema>;
  itemType?: Schema;
  /** True when this field was absent in at least one sample object during inference */
  optional?: boolean;
  /** True when the value was explicitly null in at least one sample */
  nullable?: boolean;
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
  _structureHash?: string;
  _sharedTypeName?: string;
  /** Optional runtime metadata produced by the inference engine (when enabled) */
  _meta?: Record<string, any>;
}

export interface Converter {
  slug: string;
  title: string;
  description: string;
  h1?: string;
}

// ---------------------------------------------------------------------------
// TypeFlow-AST (Language-Agnostic Abstract Syntax Tree)
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

export type ASTTypeKind = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'any' | 'classRef' | 'array' | 'union' | 'enum';

export interface ASTType {
  kind: ASTTypeKind;
  classRefName?: string;         // Used when kind is 'classRef'
  itemType?: ASTType;            // Used when kind is 'array'
  unionTypes?: ASTTypeKind[];    // Used when kind is 'union'
  enumValues?: string[];         // Used when kind is 'enum'
  format?: string;               // e.g. 'int', 'float', 'date', 'email', 'uuid'
}
