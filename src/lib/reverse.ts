import { extractTypeGraph, splitMembers, type TypeNode } from './graph';

type JsonVal = null | boolean | number | string | JsonVal[] | { [k: string]: JsonVal };

function sampleString(fieldName: string): string {
  const k = fieldName.toLowerCase();
  if (/(_id$|^id$)/.test(k) || /Id$/.test(fieldName)) return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  if (/email/.test(k)) return 'user@example.com';
  if (/url|link|href|uri|website/.test(k)) return 'https://example.com';
  if (/(_at$|_date$|_time$)/.test(k) || /^(created|updated|deleted|started|ended|expires|published)/.test(k)) return '2024-01-01T00:00:00Z';
  if (/phone|tel/.test(k)) return '+1-555-000-0000';
  if (/zip|postal/.test(k)) return '10001';
  if (/country/.test(k)) return 'US';
  if (/currency/.test(k)) return 'USD';
  if (/language|locale/.test(k)) return 'en';
  if (/color|colour/.test(k)) return '#000000';
  if (/password|secret|token|key/.test(k)) return 'example-token';
  if (/name/.test(k)) return 'Example Name';
  if (/title/.test(k)) return 'Example Title';
  if (/description|desc|body|content|message|note/.test(k)) return 'Example text';
  if (/path|route/.test(k)) return '/example';
  if (/status|type|kind|category|tag|label/.test(k)) return 'active';
  return 'string';
}

function sampleNumber(fieldName: string): number {
  const k = fieldName.toLowerCase();
  if (/price|amount|cost|fee|balance|salary|budget|total|subtotal/.test(k)) return 9.99;
  if (/percent|rate/.test(k)) return 50;
  if (/lat/.test(k)) return 35.6895;
  if (/lng|lon/.test(k)) return 139.6917;
  if (/year/.test(k)) return 2024;
  if (/month/.test(k)) return 1;
  if (/day/.test(k)) return 1;
  if (/age/.test(k)) return 30;
  if (/count|quantity|qty|size|length/.test(k)) return 1;
  if (/index|rank|page/.test(k)) return 1;
  return 0;
}

function parseType(
  typeStr: string,
  fieldName: string,
  nodeMap: Map<string, TypeNode>,
  visited: Set<string>,
  depth: number
): JsonVal {
  if (depth > 6) return null;
  const t = typeStr.trim().replace(/;$/, '');

  // Union: pick first non-null/undefined member
  if (t.includes('|')) {
    const members = t.split('|').map(m => m.trim()).filter(m => m !== 'null' && m !== 'undefined' && m !== 'never' && m !== 'void');
    if (members.length === 0) return null;
    return parseType(members[0], fieldName, nodeMap, visited, depth);
  }

  // Primitives
  if (t === 'string') return sampleString(fieldName);
  if (t === 'number' || t === 'bigint' || t === 'int' || t === 'float') return sampleNumber(fieldName);
  if (t === 'boolean') return false;
  if (t === 'null' || t === 'undefined' || t === 'void' || t === 'never') return null;
  if (t === 'any' || t === 'unknown') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'object' || t === 'Record<string,unknown>' || t === 'Record<string, unknown>') return {};

  // String literal: 'shipped' or "shipped"
  const strLit = t.match(/^['"](.+)['"]$/);
  if (strLit) return strLit[1];

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);

  // Array: Type[] or Array<Type>
  const arrayBracket = t.match(/^(.+)\[\]$/);
  if (arrayBracket) {
    return [parseType(arrayBracket[1].trim(), fieldName, nodeMap, visited, depth + 1)];
  }
  const arrayGeneric = t.match(/^Array<(.+)>$/);
  if (arrayGeneric) {
    return [parseType(arrayGeneric[1].trim(), fieldName, nodeMap, visited, depth + 1)];
  }

  // Utility types: unwrap first type arg
  const wrapper = t.match(/^(?:Partial|Required|Readonly|NonNullable|Promise)<(.+)>$/);
  if (wrapper) return parseType(wrapper[1].split(',')[0].trim(), fieldName, nodeMap, visited, depth);

  // Record<K,V> / Map / Set
  if (/^(Record|Map|Set)</.test(t)) return {};

  // Interface reference
  if (nodeMap.has(t)) {
    if (visited.has(t)) return {};
    return buildFromNode(nodeMap.get(t)!, nodeMap, new Set([...visited, t]), depth + 1);
  }

  // Inline object literal: { city: string; zip: number }
  if (t.startsWith('{') && t.endsWith('}')) {
    return parseInlineObject(t.slice(1, -1), nodeMap, visited, depth + 1);
  }

  return null;
}

/** Builds a sample object from an inline object-literal body (braces already stripped). */
function parseInlineObject(
  body: string,
  nodeMap: Map<string, TypeNode>,
  visited: Set<string>,
  depth: number
): { [k: string]: JsonVal } {
  if (depth > 6) return {};
  const result: { [k: string]: JsonVal } = {};
  for (const member of splitMembers(body)) {
    // skip index signatures: [key: string]: V
    if (/^\[/.test(member)) continue;
    const m = member.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);
    if (!m) continue;
    const [, fieldName, , rawType] = m;
    result[fieldName] = parseType(rawType.replace(/[;,]\s*$/, '').trim(), fieldName, nodeMap, visited, depth);
  }
  return result;
}

function buildFromNode(
  node: TypeNode,
  nodeMap: Map<string, TypeNode>,
  visited: Set<string>,
  depth: number
): { [k: string]: JsonVal } {
  const result: { [k: string]: JsonVal } = {};
  for (const field of node.fields) {
    result[field.name] = parseType(field.type, field.name, nodeMap, visited, depth);
  }
  return result;
}

/**
 * Extracts object-literal type aliases (`type X = { ... }`) as TypeNodes.
 * extractTypeGraph only handles `interface` declarations, so without this a file
 * of only `type` aliases yields "No interfaces found" and alias references inside
 * interfaces resolve to null.
 */
function extractObjectTypeAliases(tsCode: string): TypeNode[] {
  const nodes: TypeNode[] = [];
  const headerRe = /(?:export\s+)?type\s+(\w+)\s*=\s*\{/g;
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(tsCode)) !== null) {
    let depth = 1;
    let pos = hm.index + hm[0].length;
    while (pos < tsCode.length && depth > 0) {
      const ch = tsCode[pos++];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    const body = tsCode.slice(hm.index + hm[0].length, pos - 1);
    const fields: TypeNode['fields'] = [];
    for (const member of splitMembers(body)) {
      if (/^\[/.test(member)) continue; // index signature
      const fm = member.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);
      if (!fm) continue;
      fields.push({ name: fm[1], type: fm[3].replace(/[;,]\s*$/, '').trim(), optional: fm[2] === '?' });
    }
    nodes.push({ id: hm[1], label: hm[1], fields, isRoot: false });
  }
  return nodes;
}

/** Capitalized type tokens referenced by a field type (arrays/unions/generics). */
function refTokens(type: string): string[] {
  return type
    .replace(/\[\]/g, '')
    .split(/[|&,\s<>]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && /^[A-Z]/.test(t));
}

export function generateSampleJson(tsCode: string): { json: string; error?: string } {
  try {
    const graph = extractTypeGraph(tsCode);
    const aliasNodes = extractObjectTypeAliases(tsCode).filter(
      a => !graph.nodes.some(n => n.id === a.id)
    );
    const allNodes = [...graph.nodes, ...aliasNodes];
    if (allNodes.length === 0) {
      return {
        json: '',
        error: 'No TypeScript interfaces or object type aliases found.\n\nExample:\n\ninterface User {\n  user_id: string;\n  name: string;\n  email: string;\n  age: number;\n}',
      };
    }
    const nodeMap = new Map<string, TypeNode>(allNodes.map(n => [n.id, n]));
    // Recompute roots across interfaces + aliases (a node referenced by another is not a root).
    const referenced = new Set<string>();
    for (const node of allNodes) {
      for (const field of node.fields) {
        for (const token of refTokens(field.type)) {
          if (nodeMap.has(token) && token !== node.id) referenced.add(token);
        }
      }
    }
    const roots = allNodes.filter(n => !referenced.has(n.id));
    const target = roots.length > 0 ? roots[0] : allNodes[0];
    const sample = buildFromNode(target, nodeMap, new Set([target.id]), 0);
    return { json: JSON.stringify(sample, null, 2) };
  } catch (e) {
    return { json: '', error: e instanceof Error ? e.message : 'Parse error' };
  }
}
