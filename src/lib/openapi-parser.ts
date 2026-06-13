import { Schema } from './types';

export function isOpenAPISpec(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  const oaStr = String(o.openapi ?? '');
  const swStr = String(o.swagger ?? '');
  const isV3 = o.openapi !== undefined && oaStr.startsWith('3');
  const isV2 = o.swagger !== undefined && swStr.startsWith('2');
  return (isV3 || isV2) && !!(o.info || o.paths || o.components || o.definitions);
}

export function parseOpenAPIComponents(spec: Record<string, any>): { name: string; schema: Schema }[] {
  const isV3 = typeof spec.openapi === 'string' || (typeof spec.openapi === 'number');
  const rawSchemas: Record<string, any> = isV3
    ? (spec.components?.schemas ?? {})
    : (spec.definitions ?? {});

  const inProgress = new Set<string>();

  function resolveRef(ref: string): any {
    if (!ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let node: any = spec;
    for (const p of parts) {
      if (node === undefined || node === null) return null;
      node = node[p.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    return node ?? null;
  }

  function refComponentName(ref: string): string {
    return ref.split('/').pop() ?? '';
  }

  // inline=true: expand $refs fully (used inside allOf so fields are merged in)
  function convert(raw: any, depth = 0, inline = false): Schema {
    if (depth > 20 || !raw || typeof raw !== 'object') return { type: 'any' };

    // $ref resolution
    if (typeof raw.$ref === 'string') {
      const compName = refComponentName(raw.$ref);
      // Known top-level component $ref in non-inline context → named stub
      // The stub has no `fields` so schemaToAST skips traversal and just emits a classRef
      if (!inline && rawSchemas[compName] !== undefined) {
        return { type: 'object', _sharedTypeName: compName } as Schema;
      }
      if (inProgress.has(compName)) return { type: 'any' };
      const refRaw = resolveRef(raw.$ref);
      if (!refRaw) return { type: 'any' };
      return convert(refRaw, depth + 1, inline);
    }

    // allOf → merge all sub-schemas (expand $refs so fields are inherited)
    if (Array.isArray(raw.allOf)) {
      const merged: Schema = { type: 'object', fields: {} };
      for (const sub of raw.allOf) {
        const s = convert(sub, depth + 1, true); // inline=true: expand $refs
        if (s.type === 'object' && s.fields) Object.assign(merged.fields!, s.fields);
      }
      return merged;
    }

    // anyOf / oneOf → union
    if (Array.isArray(raw.anyOf) || Array.isArray(raw.oneOf)) {
      const variants: Schema[] = (raw.anyOf ?? raw.oneOf).map((s: any) => convert(s, depth + 1));
      const types = [...new Set(variants.map(v => v.type))];
      if (types.length === 1) return variants[0];
      return { type: 'union', unionTypes: types };
    }

    const oaType: string = typeof raw.type === 'string' ? raw.type : '';
    const required: string[] = Array.isArray(raw.required) ? raw.required : [];

    // Object
    if (oaType === 'object' || (!oaType && raw.properties)) {
      const fields: Record<string, Schema> = {};
      for (const [k, v] of Object.entries<any>(raw.properties ?? {})) {
        const fs = convert(v, depth + 1);
        if (!required.includes(k)) fs.optional = true;
        if (v.nullable === true) fs.nullable = true;
        fields[k] = fs;
      }
      return { type: 'object', fields };
    }

    // Array
    if (oaType === 'array') {
      const itemSchema: Schema = raw.items ? convert(raw.items, depth + 1) : { type: 'any' };
      return { type: 'array', itemType: itemSchema };
    }

    // String
    if (oaType === 'string') {
      const s: Schema = { type: 'string' };
      if (Array.isArray(raw.enum)) s.enumValues = raw.enum.map(String);
      const fmt: string = raw.format ?? '';
      if (fmt === 'date-time') s.format = 'datetime';
      else if (fmt === 'date') s.format = 'date';
      else if (fmt === 'email') s.format = 'email';
      else if (fmt === 'uri' || fmt === 'url') s.format = 'url';
      else if (fmt === 'uuid') s.format = 'uuid';
      return s;
    }

    // Integer
    if (oaType === 'integer') return { type: 'number', format: 'int' };

    // Number
    if (oaType === 'number') {
      const s: Schema = { type: 'number' };
      if (raw.format === 'float' || raw.format === 'double') s.format = 'float';
      return s;
    }

    // Boolean
    if (oaType === 'boolean') return { type: 'boolean' };

    return { type: 'any' };
  }

  const result: { name: string; schema: Schema }[] = [];

  for (const [name, raw] of Object.entries(rawSchemas)) {
    inProgress.add(name);
    const schema = convert(raw);
    inProgress.delete(name);
    (schema as any)._isTypeMorphSchema = true;
    result.push({ name, schema });
  }

  return result;
}
