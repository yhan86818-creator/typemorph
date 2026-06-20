import { extractTypeGraph, type TypeNode } from './graph';

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

  return null;
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

export function generateSampleJson(tsCode: string): { json: string; error?: string } {
  try {
    const graph = extractTypeGraph(tsCode);
    if (graph.nodes.length === 0) {
      return {
        json: '',
        error: 'No TypeScript interfaces found.\n\nExample:\n\ninterface User {\n  user_id: string;\n  name: string;\n  email: string;\n  age: number;\n}',
      };
    }
    const nodeMap = new Map<string, TypeNode>(graph.nodes.map(n => [n.id, n]));
    const roots = graph.nodes.filter(n => n.isRoot);
    const target = roots.length > 0 ? roots[0] : graph.nodes[0];
    const sample = buildFromNode(target, nodeMap, new Set([target.id]), 0);
    return { json: JSON.stringify(sample, null, 2) };
  } catch (e) {
    return { json: '', error: e instanceof Error ? e.message : 'Parse error' };
  }
}
