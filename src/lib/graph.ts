export interface TypeNode {
  id: string;
  label: string;
  fields: { name: string; type: string; optional: boolean }[];
  isRoot: boolean;
  /** Parent interface names from `extends A, B`. Optional — only present when the interface extends others. */
  extendsList?: string[];
  /** Value type of an index signature `[key: string]: V`. Optional — only present when declared. */
  indexSignature?: string;
}

/**
 * Splits an interface/object body into top-level members, respecting nested
 * braces/brackets/generics, string literals, and comments. Replaces the old
 * `body.split('\n')` which mis-handled single-line bodies, inline object-type
 * fields, and trailing comments. Separators are top-level `;`, `,`, and newlines.
 */
export function splitMembers(body: string): string[] {
  const members: string[] = [];
  let cur = '';
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const next = body[i + 1];
    if (inStr) {
      cur += ch;
      if (ch === '\\') { cur += next ?? ''; i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    // Line comment
    if (ch === '/' && next === '/') {
      while (i < body.length && body[i] !== '\n') i++;
      // step back so the loop's i++ lands on the newline (handled as separator)
      i--;
      continue;
    }
    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < body.length && !(body[i] === '*' && body[i + 1] === '/')) i++;
      i++; // skip the closing '/'
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; cur += ch; continue; }
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') { depth++; cur += ch; continue; }
    if (ch === '>' || ch === ')' || ch === ']' || ch === '}') { depth = Math.max(0, depth - 1); cur += ch; continue; }
    if (depth === 0 && (ch === ';' || ch === ',' || ch === '\n')) {
      if (cur.trim()) members.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) members.push(cur.trim());
  return members;
}

export interface TypeEdge {
  from: string;
  to: string;
  label: string; // field name that creates this reference
}

export interface TypeGraph {
  nodes: TypeNode[];
  edges: TypeEdge[];
}

/**
 * Parses TypeScript interface code and extracts nodes + directed edges.
 * Works entirely on text, so no compiler dependency.
 */
export function extractTypeGraph(tsCode: string): TypeGraph {
  const nodes: TypeNode[] = [];
  const edges: TypeEdge[] = [];

  const allInterfaceNames = new Set<string>();
  // First pass: collect all interface names
  const scanRegex = /(?:export\s+)?interface\s+(\w+)/g;
  let scanMatch: RegExpExecArray | null;
  while ((scanMatch = scanRegex.exec(tsCode)) !== null) {
    allInterfaceNames.add(scanMatch[1]);
  }

  // Extract interface declarations with balanced-brace body parsing so that
  // field types containing '{...}' object literals don't truncate the body.
  const extractedInterfaces: { name: string; body: string; extendsRaw?: string }[] = [];
  const headerRe = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{/g;
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(tsCode)) !== null) {
    const ifName = hm[1];
    const extendsRaw = hm[2];
    let depth = 1;
    let pos = hm.index + hm[0].length;
    while (pos < tsCode.length && depth > 0) {
      const ch = tsCode[pos++];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    extractedInterfaces.push({ name: ifName, body: tsCode.slice(hm.index + hm[0].length, pos - 1), extendsRaw });
  }

  const nodeMap = new Map<string, TypeNode>();

  // Second pass: extract fields and build nodes
  for (const { name: interfaceName, body, extendsRaw } of extractedInterfaces) {
    const fields: TypeNode['fields'] = [];
    let indexSignature: string | undefined;

    for (const member of splitMembers(body)) {
      // Index signature: [key: string]: ValueType
      const idxMatch = member.match(/^\[\s*\w+\s*:\s*(?:string|number|symbol)\s*\]\s*:\s*([\s\S]+)$/);
      if (idxMatch) {
        indexSignature = idxMatch[1].trim();
        continue;
      }

      // Match: (readonly)? fieldName?: TypeName  (type may span lines for inline object literals)
      const fieldMatch = member.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);
      if (!fieldMatch) continue;

      const [, fieldName, optional, rawType] = fieldMatch;
      const cleanType = rawType.replace(/[;,]\s*$/, '').trim();

      fields.push({
        name: fieldName,
        type: cleanType,
        optional: optional === '?'
      });
    }

    const extendsList = extendsRaw
      ? extendsRaw.split(',').map(s => s.trim().replace(/<.*$/, '').trim()).filter(Boolean)
      : undefined;

    const node: TypeNode = {
      id: interfaceName,
      label: interfaceName,
      fields,
      isRoot: false,
      ...(extendsList && extendsList.length ? { extendsList } : {}),
      ...(indexSignature ? { indexSignature } : {}),
    };

    // Skip duplicate interface names (same interface may appear in multiple output tabs)
    if (nodeMap.has(interfaceName)) continue;
    nodes.push(node);
    nodeMap.set(interfaceName, node);
  }

  // Third pass: detect edges (field types that reference other interfaces)
  for (const node of nodes) {
    for (const field of node.fields) {
      // Extract base type names from arrays and unions: string[], User | null, Address[]
      const typeTokens = field.type
        .replace(/\[\]/g, '')
        .split(/[|&,\s<>]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0 && /^[A-Z]/.test(t)); // only capitalized = interface ref

      for (const token of typeTokens) {
        if (allInterfaceNames.has(token) && token !== node.id) {
          // Avoid duplicate edges
          const exists = edges.some(e => e.from === node.id && e.to === token && e.label === field.name);
          if (!exists) {
            edges.push({
              from: node.id,
              to: token,
              label: field.name
            });
          }
        }
      }
    }
  }

  // Mark root nodes (not referenced by any other node)
  const referencedIds = new Set(edges.map(e => e.to));
  for (const node of nodes) {
    node.isRoot = !referencedIds.has(node.id);
  }

  return { nodes, edges };
}
