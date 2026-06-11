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

  // Match all interface declarations
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+[\w,\s]+)?\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  const allInterfaceNames = new Set<string>();
  // First pass: collect all interface names
  const scanRegex = /(?:export\s+)?interface\s+(\w+)/g;
  let scanMatch: RegExpExecArray | null;
  while ((scanMatch = scanRegex.exec(tsCode)) !== null) {
    allInterfaceNames.add(scanMatch[1]);
  }

  const nodeMap = new Map<string, TypeNode>();

  // Second pass: extract fields and build nodes
  while ((match = interfaceRegex.exec(tsCode)) !== null) {
    const interfaceName = match[1];
    const body = match[2];

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
