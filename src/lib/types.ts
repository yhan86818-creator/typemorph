export interface Schema {
  type: string;
  format?: 'email' | 'url' | 'uuid' | 'datetime';
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
}

export interface Converter {
  slug: string;
  title: string;
  description: string;
  h1?: string;
}
