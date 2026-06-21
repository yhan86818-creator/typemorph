import { extractTypeGraph, splitMembers, type TypeNode } from './graph';

/**
 * Constraints parsed from a field's JSDoc block. Only whitelisted `@`-tags are
 * recognised so arbitrary comment text can never inject into the output.
 */
interface JsdocConstraints {
  min?: number;
  max?: number;
  int?: boolean;
  positive?: boolean;
  negative?: boolean;
  format?: 'email' | 'url' | 'uuid';
  regex?: string;
  description?: string;
}

// Field-name → constraints for the current tsToZod() call. Module-level because
// typeToZod/parseObjectMembers/nodeToZod recurse and threading it through every
// signature would be noisy; JS is single-threaded so each synchronous call owns it.
let jsdocMap: Map<string, JsdocConstraints> = new Map();

/** Parses the inner text of a `/** … *​/` block into whitelisted constraints. */
function parseJsdoc(raw: string): JsdocConstraints {
  const c: JsdocConstraints = {};
  const text = raw
    .split('\n')
    .map(l => l.replace(/^\s*\*+\s?/, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  const num = (tag: string): number | undefined => {
    const m = text.match(new RegExp(`@${tag}\\b\\s+(-?\\d+(?:\\.\\d+)?)`));
    return m ? parseFloat(m[1]) : undefined;
  };
  const has = (tag: string) => new RegExp(`@${tag}\\b`).test(text);

  const min = num('min'); if (min !== undefined) c.min = min;
  const max = num('max'); if (max !== undefined) c.max = max;
  if (has('int')) c.int = true;
  if (has('positive')) c.positive = true;
  if (has('negative')) c.negative = true;

  // @email / @url / @uuid, or @format email|url|uuid
  if (has('email')) c.format = 'email';
  else if (has('url')) c.format = 'url';
  else if (has('uuid')) c.format = 'uuid';
  const fmt = text.match(/@format\s+(email|url|uuid)\b/);
  if (fmt) c.format = fmt[1] as JsdocConstraints['format'];

  // @pattern / @regex — validate via RegExp so only real patterns pass through
  const pat = text.match(/@(?:pattern|regex)\s+(.+?)(?:\s+@|$)/);
  if (pat) {
    const src = pat[1].trim().replace(/^\/|\/$/g, '');
    try { new RegExp(src); c.regex = src; } catch { /* drop invalid pattern */ }
  }

  // @description "...", else leading free text before the first @tag
  const desc = text.match(/@description\s+(.+?)(?:\s+@|$)/);
  if (desc) {
    c.description = desc[1].trim().replace(/^["']|["']$/g, '');
  } else {
    const lead = text.match(/^([^@]+?)(?:\s+@|$)/);
    if (lead && lead[1].trim()) c.description = lead[1].trim();
  }

  return c;
}

/**
 * Builds the field-name → constraints map from raw TS. Comments are stripped by
 * splitMembers before fields are parsed, so JSDoc must be read here from source.
 *
 * Constraints are keyed by field name (the parsing path discards positions), so a
 * name that occurs on more than one field anywhere in the file is dropped — this
 * prevents a JSDoc'd field from leaking its constraints onto an unrelated
 * same-named field that the user never annotated. Conservative by design.
 */
function buildJsdocMap(tsCode: string): Map<string, JsdocConstraints> {
  const map = new Map<string, JsdocConstraints>();
  const re = /\/\*\*([\s\S]*?)\*\/\s*(?:readonly\s+)?(\w+)\??\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tsCode)) !== null) {
    const c = parseJsdoc(m[1]);
    if (Object.keys(c).length === 0) continue;
    const name = m[2];
    if (!map.has(name)) map.set(name, c);
  }
  if (map.size === 0) return map;

  // Count every field declaration (comments stripped so JSDoc text can't inflate
  // counts) and drop any annotated name that is not globally unique.
  const noComments = tsCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const counts = new Map<string, number>();
  const fieldRe = /(?:^|[{;,\n])\s*(?:readonly\s+)?(\w+)\??\s*:/g;
  let fm: RegExpExecArray | null;
  while ((fm = fieldRe.exec(noComments)) !== null) {
    counts.set(fm[1], (counts.get(fm[1]) ?? 0) + 1);
  }
  for (const name of [...map.keys()]) {
    if ((counts.get(name) ?? 0) > 1) map.delete(name);
  }
  return map;
}

/**
 * Applies parsed JSDoc constraints to a base Zod expression. Numeric/string
 * refinements only attach to bare `z.string()` / `z.number()` bases; everything
 * else receives only `.describe()`. Format tags use the chained `.email()` form,
 * which is valid in both Zod v3 and v4.
 */
function applyJsdoc(zod: string, c: JsdocConstraints | undefined): string {
  if (!c) return zod;
  let out = zod;
  if (out === 'z.string()') {
    if (c.format === 'email') out += '.email()';
    else if (c.format === 'url') out += '.url()';
    else if (c.format === 'uuid') out += '.uuid()';
    if (c.min !== undefined) out += `.min(${c.min})`;
    if (c.max !== undefined) out += `.max(${c.max})`;
    if (c.regex) out += `.regex(/${c.regex.replace(/\//g, '\\/')}/)`;
  } else if (out === 'z.number()') {
    if (c.int) out += '.int()';
    if (c.positive) out += '.positive()';
    if (c.negative) out += '.negative()';
    if (c.min !== undefined) out += `.min(${c.min})`;
    if (c.max !== undefined) out += `.max(${c.max})`;
  }
  if (c.description) out += `.describe(${JSON.stringify(c.description)})`;
  return out;
}

function splitTopLevel(str: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') depth--;
    else if (depth === 0 && str.slice(i, i + sep.length) === sep) {
      parts.push(cur.trim());
      cur = '';
      i += sep.length;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function typeToZod(typeStr: string, nodeMap: Map<string, string>, depth = 0): string {
  if (depth > 8) return 'z.unknown()';
  const t = typeStr.trim().replace(/;$/, '');

  // Top-level union
  if (splitTopLevel(t, '|').length > 1) {
    const members = splitTopLevel(t, '|');
    const nullMembers    = members.filter(m => m === 'null');
    const undefMembers   = members.filter(m => m === 'undefined');
    const realMembers    = members.filter(m => m !== 'null' && m !== 'undefined');

    // All string literals → z.enum()
    if (realMembers.every(m => /^['"`].*['"`]$/.test(m))) {
      const vals = realMembers.map(m => `'${m.replace(/^['"`]|['"`]$/g, "").replace(/'/g, "\\'")}'`);
      const base = `z.enum([${vals.join(', ')}])`;
      if (nullMembers.length && undefMembers.length) return `${base}.nullish()`;
      if (nullMembers.length) return `${base}.nullable()`;
      if (undefMembers.length) return `${base}.optional()`;
      return base;
    }

    if (realMembers.length === 1) {
      const base = typeToZod(realMembers[0], nodeMap, depth);
      if (nullMembers.length && undefMembers.length) return `${base}.nullish()`;
      if (nullMembers.length) return `${base}.nullable()`;
      if (undefMembers.length) return `${base}.optional()`;
      return base;
    }

    if (realMembers.length > 1) {
      const parts = realMembers.map(m => typeToZod(m, nodeMap, depth + 1));
      const base = `z.union([${parts.join(', ')}])`;
      if (nullMembers.length && undefMembers.length) return `${base}.nullish()`;
      if (nullMembers.length) return `${base}.nullable()`;
      if (undefMembers.length) return `${base}.optional()`;
      return base;
    }

    return 'z.null()';
  }

  // Intersection — simplify to z.intersection()
  if (splitTopLevel(t, '&').length > 1) {
    const parts = splitTopLevel(t, '&').map(m => typeToZod(m, nodeMap, depth + 1));
    return parts.length === 2
      ? `z.intersection(${parts[0]}, ${parts[1]})`
      : `z.intersection(${parts[0]}, z.intersection(${parts.slice(1).join(', ')}))`;
  }

  // Primitives
  if (t === 'string')  return 'z.string()';
  if (t === 'number' || t === 'bigint') return 'z.number()';
  if (t === 'boolean') return 'z.boolean()';
  if (t === 'null')    return 'z.null()';
  if (t === 'undefined') return 'z.undefined()';
  if (t === 'any')     return 'z.any()';
  if (t === 'unknown') return 'z.unknown()';
  if (t === 'never')   return 'z.never()';
  if (t === 'void')    return 'z.void()';
  if (t === 'Date')    return 'z.date()';
  if (t === 'true')    return 'z.literal(true)';
  if (t === 'false')   return 'z.literal(false)';

  // String literal
  if (/^['"`].*['"`]$/.test(t)) return `z.literal(${t.replace(/`/g, "'")})`;
  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(t)) return `z.literal(${t})`;

  // Array: T[] or Array<T>
  const arr1 = t.match(/^(.+)\[\]$/);
  if (arr1) return `z.array(${typeToZod(arr1[1].trim(), nodeMap, depth + 1)})`;
  const arr2 = t.match(/^Array<(.+)>$/);
  if (arr2) return `z.array(${typeToZod(arr2[1].trim(), nodeMap, depth + 1)})`;

  // Record<K,V>
  const rec = t.match(/^Record<(.+)>$/);
  if (rec) {
    const [k, ...vs] = splitTopLevel(rec[1], ',');
    return `z.record(${typeToZod(k.trim(), nodeMap, depth + 1)}, ${typeToZod(vs.join(',').trim(), nodeMap, depth + 1)})`;
  }

  // Promise<T>, Partial<T>, Required<T>, Readonly<T>, NonNullable<T>
  const wrapper = t.match(/^(?:Promise|Partial|Required|Readonly|NonNullable)<(.+)>$/);
  if (wrapper) return typeToZod(wrapper[1].trim(), nodeMap, depth + 1);

  // Tuple: [A, B, ...]
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1);
    const parts = splitTopLevel(inner, ',').map(m => typeToZod(m.trim(), nodeMap, depth + 1));
    return `z.tuple([${parts.join(', ')}])`;
  }

  // Inline object literal: { a: string; b: number; [key: string]: T }
  if (t.startsWith('{') && t.endsWith('}')) {
    const { fields, indexSig } = parseObjectMembers(t.slice(1, -1), nodeMap, depth + 1);
    if (fields.length === 0 && indexSig) {
      return `z.record(z.string(), ${typeToZod(indexSig, nodeMap, depth + 1)})`;
    }
    const inner = fields.map(f => `${f.name}: ${f.zod}`).join(', ');
    let out = `z.object({ ${inner} })`;
    if (indexSig) out += `.catchall(${typeToZod(indexSig, nodeMap, depth + 1)})`;
    return out;
  }

  // Known type alias or interface reference
  if (nodeMap.has(t)) return nodeMap.get(t)!;

  return 'z.unknown()';
}

/**
 * Parses an object body (no surrounding braces) into Zod field entries plus an
 * optional index-signature value type. Shares {@link splitMembers} with the
 * graph extractor so inline objects, single-line bodies, and comments are
 * handled identically everywhere.
 */
function parseObjectMembers(
  body: string,
  nodeMap: Map<string, string>,
  depth: number
): { fields: { name: string; zod: string }[]; indexSig?: string } {
  const fields: { name: string; zod: string }[] = [];
  let indexSig: string | undefined;
  for (const member of splitMembers(body)) {
    const idx = member.match(/^\[\s*\w+\s*:\s*(?:string|number|symbol)\s*\]\s*:\s*([\s\S]+)$/);
    if (idx) { indexSig = idx[1].trim(); continue; }
    const fm = member.match(/^(\w+)(\?)?\s*:\s*([\s\S]+)$/);
    if (!fm) continue;
    const [, name, optional, rawType] = fm;
    let zod = typeToZod(rawType.trim(), nodeMap, depth);
    zod = applyJsdoc(zod, jsdocMap.get(name));
    if (optional === '?' && !zod.endsWith('.optional()') && !zod.endsWith('.nullish()')) {
      zod += '.optional()';
    }
    fields.push({ name, zod });
  }
  return { fields, indexSig };
}

function nodeToZod(node: TypeNode, nodeMap: Map<string, string>): string {
  const schemaName = `${node.id}Schema`;
  const fieldLines = node.fields.map(f => {
    let zod = typeToZod(f.type, nodeMap);
    zod = applyJsdoc(zod, jsdocMap.get(f.name));
    if (f.optional && !zod.endsWith('.optional()') && !zod.endsWith('.nullish()')) {
      zod += '.optional()';
    }
    return `  ${f.name}: ${zod},`;
  });

  const typeAlias = `export type ${node.id} = z.infer<typeof ${schemaName}>;`;

  // Only parents that resolve to an object schema (`${p}Schema`) can be merged
  // via `.extend()`; primitive aliases (mapped to inline `z.…()`) are skipped.
  const parents = (node.extendsList ?? []).filter(p => nodeMap.get(p) === `${p}Schema`);
  const catchall = node.indexSignature
    ? `.catchall(${typeToZod(node.indexSignature, nodeMap)})`
    : '';

  // Pure index signature, no named fields, no parents → z.record
  if (parents.length === 0 && node.fields.length === 0 && node.indexSignature) {
    return [
      `export const ${schemaName} = z.record(z.string(), ${typeToZod(node.indexSignature, nodeMap)});`,
      typeAlias,
    ].join('\n');
  }

  // Inheritance → BaseSchema.extend(...)
  if (parents.length > 0) {
    let base = `${parents[0]}Schema`;
    for (let i = 1; i < parents.length; i++) base += `.extend(${parents[i]}Schema.shape)`;
    if (fieldLines.length > 0) {
      base += ['.extend({', ...fieldLines, '})'].join('\n');
    }
    return [
      `export const ${schemaName} = ${base}${catchall};`,
      typeAlias,
    ].join('\n');
  }

  // Plain object
  return [
    `export const ${schemaName} = z.object({`,
    ...fieldLines,
    `})${catchall};`,
    typeAlias,
  ].join('\n');
}

// Parses object type aliases (type Foo = { ... }) into schema blocks.
// Two-pass: first register all names so forward refs work, then generate blocks.
function extractObjectTypeAliases(
  tsCode: string,
  nodeMap: Map<string, string>
): string[] {
  const found: { name: string; body: string }[] = [];
  const objRe = /(?:export\s+)?type\s+(\w+)\s*=\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(tsCode)) !== null) {
    const name = m[1];
    if (nodeMap.has(name)) continue;
    let depth = 1;
    let pos = m.index + m[0].length;
    while (pos < tsCode.length && depth > 0) {
      if (tsCode[pos] === '{') depth++;
      else if (tsCode[pos] === '}') depth--;
      pos++;
    }
    const body = tsCode.slice(m.index + m[0].length, pos - 1);
    found.push({ name, body });
    nodeMap.set(name, `${name}Schema`); // register early for forward refs
  }

  // Second pass: generate blocks now that all names are in nodeMap
  const blocks: string[] = [];
  for (const { name, body } of found) {
    const { fields, indexSig } = parseObjectMembers(body, nodeMap, 0);
    const catchall = indexSig ? `.catchall(${typeToZod(indexSig, nodeMap)})` : '';
    const typeAlias = `export type ${name} = z.infer<typeof ${name}Schema>;`;

    if (fields.length === 0) {
      if (indexSig) {
        blocks.push([
          `export const ${name}Schema = z.record(z.string(), ${typeToZod(indexSig, nodeMap)});`,
          typeAlias,
        ].join('\n'));
      }
      continue;
    }
    blocks.push([
      `export const ${name}Schema = z.object({`,
      ...fields.map(f => `  ${f.name}: ${f.zod},`),
      `})${catchall};`,
      typeAlias,
    ].join('\n'));
  }
  return blocks;
}

// Parses simple (non-object, non-generic) type aliases and adds them to nodeMap.
// Called after interfaces are registered so interfaces always win on name collision.
function extractSimpleTypeAliases(tsCode: string, nodeMap: Map<string, string>): void {
  // Naturally excludes generics (type Foo<T> = …) — no < between name and =
  // Excludes object aliases (starts with {) — handled by extractObjectTypeAliases
  const re = /(?:export\s+)?type\s+(\w+)\s*=\s*([^{<\n][^;\n]*?)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tsCode)) !== null) {
    const [, name, rawType] = m;
    if (nodeMap.has(name)) continue;
    const trimmed = rawType.trim();
    if (!trimmed) continue;
    try {
      const zod = typeToZod(trimmed, nodeMap);
      nodeMap.set(name, zod);
    } catch { /* skip */ }
  }
}

// Parses TypeScript `enum` declarations into Zod schemas.
// String-valued enums → z.enum([...values]); numeric/mixed enums → the original
// enum (re-emitted so it exists at runtime) + z.nativeEnum(Name).
function extractEnums(tsCode: string, nodeMap: Map<string, string>): string[] {
  const blocks: string[] = [];
  const re = /(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tsCode)) !== null) {
    const name = m[1];
    if (nodeMap.has(name)) continue;
    const members = m[2].split(',').map(s => s.trim()).filter(Boolean);
    if (members.length === 0) continue;

    const parsed = members.map(mem => {
      const eq = mem.match(/^(\w+)\s*=\s*(.+)$/);
      return eq
        ? { key: eq[1], value: eq[2].trim() as string | undefined }
        : { key: mem, value: undefined as string | undefined };
    });
    nodeMap.set(name, `${name}Schema`);

    const allStringValued = parsed.every(p => p.value && /^['"`].*['"`]$/.test(p.value));
    if (allStringValued) {
      const vals = parsed.map(
        p => `'${p.value!.replace(/^['"`]|['"`]$/g, '').replace(/'/g, "\\'")}'`
      );
      blocks.push([
        `export const ${name}Schema = z.enum([${vals.join(', ')}]);`,
        `export type ${name} = z.infer<typeof ${name}Schema>;`,
      ].join('\n'));
    } else {
      blocks.push([
        `export enum ${name} { ${members.join(', ')} }`,
        `export const ${name}Schema = z.nativeEnum(${name});`,
      ].join('\n'));
    }
  }
  return blocks;
}

// Reorders nodes so that a node's `extends` parents are declared before it,
// preventing "used before declaration" in the generated schema file. Identity
// when no interface extends another, so existing ordering is preserved.
function orderByExtends(nodes: TypeNode[]): TypeNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const result: TypeNode[] = [];
  const seen = new Set<string>();
  const visit = (n: TypeNode) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    for (const p of n.extendsList ?? []) {
      const pn = byId.get(p);
      if (pn) visit(pn);
    }
    result.push(n);
  };
  for (const n of nodes) visit(n);
  return result;
}

export interface TsToZodResult {
  output: string;
  schemaCount: number;
  error?: string;
}

export function tsToZod(tsCode: string): TsToZodResult {
  try {
    jsdocMap = buildJsdocMap(tsCode);
    const graph = extractTypeGraph(tsCode);

    // Build nodeMap: interfaceName → schemaRefName (e.g. "User" → "UserSchema")
    const nodeMap = new Map<string, string>(
      graph.nodes.map(n => [n.id, `${n.id}Schema`])
    );

    // Enums first — they are leaf schemas other declarations may reference.
    const enumBlocks = extractEnums(tsCode, nodeMap);

    // Object type aliases (two-pass: register names, then generate blocks)
    const objectAliasBlocks = extractObjectTypeAliases(tsCode, nodeMap);

    // Simple type aliases (inline expressions, no separate block)
    extractSimpleTypeAliases(tsCode, nodeMap);

    const totalCount = graph.nodes.length + objectAliasBlocks.length + enumBlocks.length;
    if (totalCount === 0) {
      return {
        output: '',
        schemaCount: 0,
        error: 'No TypeScript interfaces or type aliases found.\n\nExample:\n\ninterface User {\n  email: string;\n  age: number;\n  role: "admin" | "user";\n}',
      };
    }

    // Sort interfaces: dependencies first so schemas are declared before use,
    // then hoist `extends` parents ahead of their children.
    const referencedIds = new Set(graph.edges.map(e => e.to));
    const sorted = orderByExtends([
      ...graph.nodes.filter(n => referencedIds.has(n.id)),
      ...graph.nodes.filter(n => !referencedIds.has(n.id)),
    ]);

    const interfaceBlocks = sorted.map(n => nodeToZod(n, nodeMap));
    const allBlocks = [...enumBlocks, ...objectAliasBlocks, ...interfaceBlocks];

    const output = [
      "import { z } from 'zod';",
      '',
      allBlocks.join('\n\n'),
    ].join('\n');

    return { output, schemaCount: totalCount };
  } catch (e) {
    return {
      output: '',
      schemaCount: 0,
      error: e instanceof Error ? e.message : 'Parse error',
    };
  }
}

export const TS_TO_ZOD_SAMPLE = `type UserId = string;
type Status = 'active' | 'inactive';
type Role = 'admin' | 'user' | 'guest';
type Tags = string[];

interface Address {
  street: string;
  city: string;
  country: string;
  zip?: string;
}

interface User {
  id: UserId;
  email: string;
  age: number;
  role: Role;
  status: Status;
  address: Address;
  tags: Tags;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  deletedAt?: Date | null;
}`;
