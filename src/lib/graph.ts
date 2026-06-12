export interface TypeNode {
  id: string;
  label: string;
  fields: { name: string; type: string; optional: boolean }[];
  isRoot: boolean;
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
  const extractedInterfaces: { name: string; body: string }[] = [];
  const headerRe = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+[\w,\s]+)?\s*\{/g;
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(tsCode)) !== null) {
    const ifName = hm[1];
    let depth = 1;
    let pos = hm.index + hm[0].length;
    while (pos < tsCode.length && depth > 0) {
      const ch = tsCode[pos++];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    extractedInterfaces.push({ name: ifName, body: tsCode.slice(hm.index + hm[0].length, pos - 1) });
  }

  const nodeMap = new Map<string, TypeNode>();

  // Second pass: extract fields and build nodes
  for (const { name: interfaceName, body } of extractedInterfaces) {
    const fields: TypeNode['fields'] = [];
    const fieldLines = body.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of fieldLines) {
      // Skip comment lines
      if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;

      // Match: fieldName?: TypeName; or fieldName: TypeName;
      const fieldMatch = line.match(/^(\w+)(\?)?:\s*(.+?);?\s*$/);
      if (!fieldMatch) continue;

      const [, fieldName, optional, rawType] = fieldMatch;
      const cleanType = rawType.replace(/[;,]$/, '').trim();

      fields.push({
        name: fieldName,
        type: cleanType,
        optional: optional === '?'
      });
    }

    const node: TypeNode = {
      id: interfaceName,
      label: interfaceName,
      fields,
      isRoot: false
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
