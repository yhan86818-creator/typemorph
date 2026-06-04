const fs = require('fs');
let code = fs.readFileSync('src/lib/engine.ts', 'utf-8');

// 9. buildIsomorphicGroups
const buildIsomorphicGroupsFn = `interface IsomorphicGroup {
  group: Schema[];
  semanticName: string;
}

const buildIsomorphicGroups = (
  nodes: { schema: Schema; parentKey: string }[],
  options: { sharedPrefix?: string; minMatchRatio?: number; maxTypeMismatches?: number; minFieldsForIsomorphic?: number; customTypeNames?: Record<string, string>; disabledUnifications?: string[] } = {}
): IsomorphicGroup[] => {
  const prefix = options.sharedPrefix !== undefined ? options.sharedPrefix : 'Shared';
  const rawGroups: Schema[][] = [];

  for (const node of nodes) {
    let found = false;
    for (const group of rawGroups) {
      if (areFieldsIsomorphic(node.schema, group[0], new Set(), options as any)) {
        group.push(node.schema);
        found = true;
        break;
      }
    }
    if (!found) rawGroups.push([node.schema]);
  }

  const sharedNames = new Set<string>();
  let counter = 1;
  const result: IsomorphicGroup[] = [];

  for (const group of rawGroups) {
    if (group.length < 2) continue;
    group.sort((a, b) => Object.keys(b.fields || {}).length - Object.keys(a.fields || {}).length);
    const rep = group[0];
    const repNode = nodes.find(n => n.schema === rep) || nodes.find(n => group.includes(n.schema));
    const representativeKey = repNode?.parentKey || 'Object';
    const fieldNames = Object.keys(rep.fields || {});

    let semanticName = '';
    if (fieldNames.includes('city') && (fieldNames.includes('street') || fieldNames.includes('zip'))) {
      semanticName = prefix ? \`\${prefix}Address\` : 'Address';
    } else if (fieldNames.includes('amount') && fieldNames.includes('currency')) {
      semanticName = prefix ? \`\${prefix}Money\` : 'Money';
    } else if (fieldNames.includes('created_at') && fieldNames.includes('updated_at')) {
      semanticName = prefix ? \`\${prefix}Metadata\` : 'Metadata';
    } else if (fieldNames.includes('name') && (fieldNames.includes('email') || fieldNames.includes('age') || fieldNames.includes('profile') || fieldNames.includes('role'))) {
      semanticName = prefix ? \`\${prefix}User\` : 'User';
    } else if (fieldNames.includes('id') && fieldNames.includes('profile') && fieldNames.includes('permissions')) {
      semanticName = prefix ? \`\${prefix}Member\` : 'Member';
    } else {
      const allParentKeys = group
        .map(s => nodes.find(n => n.schema === s)?.parentKey)
        .filter((k): k is string => !!k && k !== 'Root' && k !== 'Object');
      let bestKey = allParentKeys.length > 0
        ? allParentKeys.sort((a, b) => a.length - b.length)[0]
        : representativeKey;
      if (bestKey.endsWith('s') && bestKey !== 'status' && bestKey !== 'address') {
        bestKey = bestKey.slice(0, -1);
      }
      const camelKey = bestKey.replace(/(^\\w|_\\w)/g, m => m.replace(/_/, '').toUpperCase());
      semanticName = prefix ? \`\${prefix}\${camelKey}\` : camelKey;
    }

    let finalName = semanticName;
    while (sharedNames.has(finalName)) finalName = \`\${semanticName}\${counter++}\`;
    sharedNames.add(finalName);

    result.push({ group, semanticName: finalName });
  }

  return result;
};

// 共通型の自動推論`;

code = code.replace("// 共通型の自動推論", buildIsomorphicGroupsFn);


// In extractSharedTypes:
const extStart = `  const prefix = options.sharedPrefix !== undefined ? options.sharedPrefix : 'Shared';

  // 1. 構造的同型性に基づくグループ化
  const isomorphicGroups: Schema[][] = [];`;

const extEnd = `    }
  }`;

const extTarget = code.substring(code.indexOf(extStart), code.indexOf(extEnd, code.indexOf(extStart)) + extEnd.length);

const extReplacement = `  const groups = buildIsomorphicGroups(nodes, options);

  for (const { group, semanticName } of groups) {
    if (options.disabledUnifications?.includes(semanticName)) continue;
    const finalName = options.customTypeNames?.[semanticName] ?? semanticName;
    const rep = group[0];

    for (let i = 1; i < group.length; i++) mergeIsomorphicObjects(rep, group[i]);
    for (let i = 1; i < group.length; i++) group[i].fields = rep.fields;
    for (const s of group) s._sharedTypeName = finalName;
  }`;

code = code.replace(extTarget, extReplacement);


// In getDecisions:
const decStart = `    const prefix = options.sharedPrefix !== undefined ? options.sharedPrefix : 'Shared';
    const isomorphicGroups: Schema[][] = [];`;

const decEnd = `      }
    }`;

const decTarget = code.substring(code.indexOf(decStart), code.indexOf(decEnd, code.indexOf(decStart)) + decEnd.length);

const decReplacement = `    const groups = buildIsomorphicGroups(nodes, options);

    for (const { group, semanticName } of groups) {
      const isDisabled = !!options.disabledUnifications?.includes(semanticName);
      const displayName = options.customTypeNames?.[semanticName] ?? semanticName;
      const rep = group[0];

      decisions.push({
        id: \`unify_\${semanticName}\`,
        type: 'unification',
        title: \`Unify similar objects as \${displayName}\`,
        description: \`Detected \${group.length} objects with similar fields. Unified them into \${displayName} to avoid duplicate class definitions.\`,
        meta: {
          semanticName: displayName,
          originalName: semanticName,
          count: group.length,
          fields: Object.keys(rep.fields || {}),
          disabled: isDisabled
        }
      });
    }`;

code = code.replace(decTarget, decReplacement);


// 10. engine.ts — サンプリングの Set 最適化
const arrTarget = `    let indices: number[] = [];
    if (len <= threshold) {
      indices = Array.from({ length: len }, (_, i) => i);
    } else {
      const prefix = Math.min(prefixSample, len);
      indices = Array.from({ length: prefix }, (_, i) => i);
      const remaining = Math.max(0, Math.min(sampleCount - prefix, len - prefix));
      if (remaining > 0) {
        const step = (len - prefix) / remaining;
        for (let j = 0; j < remaining; j++) {
          const idx = Math.min(len - 1, Math.floor(prefix + j * step));
          if (!indices.includes(idx)) indices.push(idx);
        }
      }
    }

    const sampledItems = indices.map(i => val[i]);`;

const arrReplacement = `    const indicesSet = new Set<number>();
    if (len <= threshold) {
      for (let i = 0; i < len; i++) indicesSet.add(i);
    } else {
      const prefixCount = Math.min(prefixSample, len);
      for (let i = 0; i < prefixCount; i++) indicesSet.add(i);
      const remaining = Math.max(0, Math.min(sampleCount - prefixCount, len - prefixCount));
      if (remaining > 0) {
        const step = (len - prefixCount) / remaining;
        for (let j = 0; j < remaining; j++) {
          indicesSet.add(Math.min(len - 1, Math.floor(prefixCount + j * step)));
        }
      }
    }
    const sampledItems = Array.from(indicesSet).map(i => val[i]);`;

code = code.replace(arrTarget, arrReplacement);

fs.writeFileSync('src/lib/engine.ts', code);
