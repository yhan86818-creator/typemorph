import { Schema } from './types';

export function isJSONSchema(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  const s = String(o.$schema ?? '');
  return s.includes('json-schema.org') || /^https?:\/\/.*\/schema/.test(s);
}

export function parseJSONSchema(root: Record<string, any>): { name: string; schema: Schema }[] {
  const defs: Record<string, any> = root.$defs ?? root.definitions ?? {};

  function resolveRef(ref: string): any {
    if (!ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let node: any = root;
    for (const p of parts) {
      if (node == null) return null;
      node = node[p.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    return node ?? null;
  }

  function defName(ref: string): string {
    return ref.split('/').pop() ?? '';
  }

  function convert(raw: any, depth = 0, inline = false): Schema {
    if (depth > 20 || !raw || typeof raw !== 'object') return { type: 'any' };

    // $ref
    if (typeof raw.$ref === 'string') {
      const name = defName(raw.$ref);
      if (!inline && defs[name] !== undefined) {
        return { type: 'object', _sharedTypeName: name } as Schema;
      }
      const resolved = resolveRef(raw.$ref);
      if (!resolved) return { type: 'any' };
      return convert(resolved, depth + 1, inline);
    }

    // allOf → merge fields
    if (Array.isArray(raw.allOf)) {
      const merged: Schema = { type: 'object', fields: {} };
      for (const sub of raw.allOf) {
        const s = convert(sub, depth + 1, true);
        if (s.type === 'object' && s.fields) Object.assign(merged.fields!, s.fields);
      }
      if (raw.properties) {
        const req: string[] = Array.isArray(raw.required) ? raw.required : [];
        for (const [k, v] of Object.entries<any>(raw.properties)) {
          const fs = convert(v, depth + 1);
          if (!req.includes(k)) fs.optional = true;
          merged.fields![k] = fs;
        }
      }
      return merged;
    }

    // anyOf / oneOf → union (null entries → nullable)
    if (Array.isArray(raw.anyOf) || Array.isArray(raw.oneOf)) {
      const variants: any[] = raw.anyOf ?? raw.oneOf;
      const nonNull = variants.filter(v => v.type !== 'null' && !(typeof v.$ref === 'string' && v.$ref === '#'));
      if (nonNull.length === 1) {
        const s = convert(nonNull[0], depth + 1, inline);
        if (nonNull.length < variants.length) s.nullable = true;
        return s;
      }
      const converted = nonNull.map(v => convert(v, depth + 1));
      const types = [...new Set(converted.map(v => v.type))];
      const result: Schema = types.length === 1 ? converted[0] : { type: 'union', unionTypes: types };
      if (nonNull.length < variants.length) result.nullable = true;
      return result;
    }

    // type can be array in JSON Schema 2020-12: ["string", "null"]
    let rawType = raw.type;
    let nullable = false;
    if (Array.isArray(rawType)) {
      const withoutNull = rawType.filter((t: string) => t !== 'null');
      nullable = withoutNull.length < rawType.length;
      rawType = withoutNull[0] ?? 'any';
    }
    const jsType: string = typeof rawType === 'string' ? rawType : '';
    const required: string[] = Array.isArray(raw.required) ? raw.required : [];

    // const → single-value enum
    if (raw.const !== undefined) {
      const t = typeof raw.const;
      if (t === 'string') return { type: 'string', enumValues: [String(raw.const)] };
      if (t === 'number') return { type: 'number' };
      if (t === 'boolean') return { type: 'boolean' };
    }

    // enum
    if (Array.isArray(raw.enum)) {
      const nonNullEnums = raw.enum.filter((e: any) => e !== null);
      const s: Schema = { type: 'string', enumValues: nonNullEnums.map(String) };
      if (nonNullEnums.length < raw.enum.length) s.nullable = true;
      return s;
    }

    // Object
    if (jsType === 'object' || (!jsType && raw.properties)) {
      const fields: Record<string, Schema> = {};
      for (const [k, v] of Object.entries<any>(raw.properties ?? {})) {
        const fs = convert(v, depth + 1);
        if (!required.includes(k)) fs.optional = true;
        fields[k] = fs;
      }
      const s: Schema = { type: 'object', fields };
      if (nullable) s.nullable = true;
      return s;
    }

    // Array
    if (jsType === 'array') {
      const items = Array.isArray(raw.items) ? raw.items[0] : raw.items;
      const itemSchema: Schema = items ? convert(items, depth + 1) : { type: 'any' };
      const s: Schema = { type: 'array', itemType: itemSchema };
      if (nullable) s.nullable = true;
      return s;
    }

    // String
    if (jsType === 'string') {
      const s: Schema = { type: 'string' };
      const fmt: string = raw.format ?? '';
      if (fmt === 'date-time') s.format = 'datetime';
      else if (fmt === 'date') s.format = 'date';
      else if (fmt === 'email') s.format = 'email';
      else if (fmt === 'uri' || fmt === 'url') s.format = 'url';
      else if (fmt === 'uuid') s.format = 'uuid';
      if (nullable) s.nullable = true;
      return s;
    }

    if (jsType === 'integer') return { type: 'number', format: 'int', ...(nullable ? { nullable } : {}) };
    if (jsType === 'number') return { type: 'number', ...(nullable ? { nullable } : {}) };
    if (jsType === 'boolean') return { type: 'boolean', ...(nullable ? { nullable } : {}) };

    return { type: 'any' };
  }

  const result: { name: string; schema: Schema }[] = [];

  // $defs / definitions → named schemas
  for (const [name, raw] of Object.entries(defs)) {
    const schema = convert(raw);
    (schema as any)._isTypeMorphSchema = true;
    result.push({ name, schema });
  }

  // Root schema itself (if it has meaningful structure)
  const hasStructure = root.type || root.properties || root.allOf || root.anyOf || root.oneOf || root.items;
  if (hasStructure) {
    const rootName: string = root.title ?? 'Root';
    if (!result.find(r => r.name === rootName)) {
      const schema = convert(root);
      (schema as any)._isTypeMorphSchema = true;
      result.unshift({ name: rootName, schema });
    }
  }

  return result;
}
