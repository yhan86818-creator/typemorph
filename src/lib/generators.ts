import { Schema } from './types';

const toPascalCase = (str: string) => str.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());

// Existing Generators (Improved)
export const tsGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}, _seen: Set<string> = new Set()): string => {
    if (schema.type === 'object' && schema.fields) {
      // Guard against infinite loops on circular refs
      if (_seen.has(name)) return '';
      _seen.add(name);
      let res = options.exportDefault && name === 'Root' ? `export default interface ${name} {\n` : `export interface ${name} {\n`;
      // optionalMark: from UI config OR data-driven inference (field.optional)
      const forceOptional = options.optionalFields;
      for (const [k, v] of Object.entries(schema.fields)) {
        const optMark = (forceOptional || v.optional) ? '?' : '';
        // Use parent-qualified child name to avoid collisions (e.g. UserMetadata vs OrderMetadata)
        const childName = name + toPascalCase(k);
        const childItemName = childName + 'Item';
        let tsType: string;
        if (v.type === 'union' && v.unionTypes) {
          tsType = v.unionTypes.join(' | ');
        } else if (v.type === 'string' && v.enumValues) {
          tsType = v.enumValues.map(ev => `"${ev}"`).join(' | ');
        } else if (v.type === 'object') {
          tsType = childName;
        } else if (v.type === 'array') {
          const it = v.itemType;
          if (it?.type === 'union' && it.unionTypes) {
            tsType = `(${it.unionTypes.join(' | ')})[]`;
          } else if (it?.type === 'string' && it.enumValues) {
            tsType = `(${it.enumValues.map(ev => `"${ev}"`).join(' | ')})[]`;
          } else {
            tsType = it?.type === 'object' ? `${childItemName}[]` : `${it?.type ?? 'any'}[]`;
          }
        } else {
          tsType = v.type;
        }

        if (v.nullable) {
          tsType = `(${tsType}) | null`;
        }

        res += `  ${k}${optMark}: ${tsType};\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const childName = name + toPascalCase(k);
        if (v.type === 'object') res += tsGen.generate(v, childName, options, _seen);
        if (v.type === 'array' && v.itemType?.type === 'object') res += tsGen.generate(v.itemType, childName + 'Item', options, _seen);
      }
      return res;
    }
    return "";
  }
};

export const zodGen = {
  generate: (schema: Schema, name: string = 'root', options: any = {}, _seen: Set<string> = new Set()): string => {
    if (schema.type === 'object' && schema.fields) {
      if (_seen.has(name)) return '';
      _seen.add(name);
      let res = `export const ${name}Schema = z.object({\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        // optional: from UI config OR data-driven inference
        const isOpt = (options.optionalFields || v.optional) ? '.optional()' : '';
        const isNull = v.nullable ? '.nullable()' : '';
        // Use parent-qualified child schema names to avoid collisions
        const childSchemaName = name + toPascalCase(k);
        let zType = '';
        if (v.type === 'union' && v.unionTypes) {
          // e.g. z.union([z.string(), z.number()])
          zType = `z.union([${v.unionTypes.map(t => `z.${t}()`).join(', ')}])`;
        } else if (v.type === 'string' && v.enumValues) {
          zType = `z.enum([${v.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
        } else if (v.type === 'object') {
          zType = `${childSchemaName}Schema`;
        } else if (v.type === 'array') {
          const it = v.itemType;
          let itemZ: string;
          if (it?.type === 'union' && it.unionTypes) {
            itemZ = `z.union([${it.unionTypes.map(t => `z.${t}()`).join(', ')}])`;
          } else if (it?.type === 'string' && it.enumValues) {
            itemZ = `z.enum([${it.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
          } else if (it?.type === 'object') {
            itemZ = `${childSchemaName}ItemSchema`;
          } else {
            itemZ = `z.${it?.type ?? 'any'}()`;
          }
          zType = `z.array(${itemZ})`;
        } else if (v.type === 'string') {
          zType = 'z.string()';
          if (v.format === 'uuid') zType += '.uuid()';
          else if (v.format === 'email') zType += '.email()';
          else if (v.format === 'url') zType += '.url()';
          else if (v.format === 'datetime') zType += '.datetime()';
          else if (options.useUUID && k.toLowerCase().endsWith('id')) zType += '.uuid()';
        } else {
          zType = `z.${v.type}()`;
        }
        res += `  ${k}: ${zType}${isNull}${isOpt},\n`;
      }
      res += `});\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const childName = name + toPascalCase(k);
        if (v.type === 'object') res += zodGen.generate(v, childName, options, _seen);
        if (v.type === 'array' && v.itemType?.type === 'object') res += zodGen.generate(v.itemType, childName + 'Item', options, _seen);
      }
      return res;
    }
    return "";
  }
};

// --- Mobile & Backend Expansion ---

export const dartGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `class ${name} {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const type = v.type === 'object' ? toPascalCase(k) : v.type === 'array' ? `List<${v.itemType?.type === 'object' ? toPascalCase(k) + 'Item' : 'dynamic'}>` : v.type === 'number' ? 'double' : v.type === 'boolean' ? 'bool' : 'String';
        res += `  final ${type} ${k};\n`;
      }
      res += `\n  ${name}({\n`;
      for (const k of Object.keys(schema.fields)) {
        res += `    required this.${k},\n`;
      }
      res += `  });\n`;
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += dartGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += dartGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const phpGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `class ${name} {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') type = 'array';
        else if (v.type === 'number') type = 'float';
        else if (v.type === 'boolean') type = 'bool';
        else type = 'string';
        res += `    public ${type} $${k};\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += phpGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += phpGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const pythonGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `class ${name}(BaseModel):\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          if (v.itemType?.type === 'object') type = `List[${toPascalCase(k)}Item]`;
          else if (v.itemType?.type === 'number') type = 'List[float]';
          else if (v.itemType?.type === 'boolean') type = 'List[bool]';
          else type = 'List[str]';
        }
        else if (v.type === 'number') type = 'float';
        else if (v.type === 'boolean') type = 'bool';
        else type = 'str';
        res += `    ${k}: ${type}\n`;
      }
      res += `\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += pythonGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += pythonGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const protoGen = {
  generate: (schema: Schema, name: string = 'Message'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `message ${name} {\n`;
      let i = 1;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          const itemType = v.itemType?.type === 'object' ? toPascalCase(k) + 'Item'
            : v.itemType?.type === 'number' ? 'double'
            : v.itemType?.type === 'boolean' ? 'bool'
            : 'string';
          res += `  repeated ${itemType} ${k} = ${i++};\n`;
          continue;
        }
        else if (v.type === 'number') type = 'double';
        else if (v.type === 'boolean') type = 'bool';
        else type = 'string';
        res += `  ${type} ${k} = ${i++};\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += protoGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += protoGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const gqlGen = {
  generate: (schema: Schema, name: string = 'Type'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `type ${name} {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          const itemType = v.itemType?.type === 'object' ? toPascalCase(k) + 'Item'
            : v.itemType?.type === 'number' ? 'Float'
            : v.itemType?.type === 'boolean' ? 'Boolean'
            : 'String';
          type = `[${itemType}]`;
        }
        else if (v.type === 'number') type = 'Float';
        else if (v.type === 'boolean') type = 'Boolean';
        else type = 'String';
        res += `  ${k}: ${type}\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += gqlGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += gqlGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const rustGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `#[derive(Serialize, Deserialize)]\npub struct ${name} {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          const it = v.itemType?.type;
          const inner = it === 'object' ? toPascalCase(k) + 'Item'
            : it === 'number' ? 'f64'
            : it === 'boolean' ? 'bool'
            : 'String';
          type = `Vec<${inner}>`;
        }
        else if (v.type === 'number') type = 'f64';
        else if (v.type === 'boolean') type = 'bool';
        else type = 'String';
        res += `  pub ${k}: ${type},\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += rustGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += rustGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const goGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `type ${name} struct {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          const it = v.itemType?.type;
          const inner = it === 'object' ? toPascalCase(k) + 'Item'
            : it === 'number' ? 'float64'
            : it === 'boolean' ? 'bool'
            : 'string';
          type = `[]${inner}`;
        }
        else if (v.type === 'number') type = 'float64';
        else if (v.type === 'boolean') type = 'bool';
        else type = 'string';
        res += `  ${toPascalCase(k)} ${type} \`json:"${k}"\`\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += goGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += goGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const javaGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `public class ${name} {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const type = v.type === 'object' ? toPascalCase(k) : v.type === 'array' ? `List<${v.itemType?.type === 'object' ? toPascalCase(k) + 'Item' : 'Object'}>` : v.type === 'number' ? 'Double' : v.type === 'boolean' ? 'Boolean' : 'String';
        res += `  private ${type} ${k};\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += javaGen.generate(v, toPascalCase(k));
      }
      return res;
    }
    return "";
  }
};

export const prismaGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `model ${name} {\n  id String @id @default(uuid())\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const type = v.type === 'number' ? 'Float' : v.type === 'boolean' ? 'Boolean' : 'String';
        res += `  ${k} ${type}\n`;
      }
      res += `}\n\n`;
      return res;
    }
    return "";
  }
};

export const uiGen = {
  generate: (schema: Schema, name: string = 'Component'): string => {
    const fields = schema.fields || {};
    const keys = Object.keys(fields);
    let res = `import React from 'react';\n\n`;
    res += `export const ${name}Card = ({ data }: { data: any }) => (\n`;
    res += `  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">\n`;
    res += `    <h3 className="text-lg font-black mb-4 dark:text-white">${name}</h3>\n`;
    res += `    <div className="grid grid-cols-2 gap-4">\n`;
    keys.slice(0, 8).forEach(k => {
      res += `      <div>\n        <p className="text-[10px] text-slate-400 uppercase">${k}</p>\n        <p className="text-sm font-bold dark:text-slate-200">{String(data?.${k} || '-')}</p>\n      </div>\n`;
    });
    res += `    </div>\n  </div>\n);\n`;
    return res;
  }
};

export const mockGen = {
  generate: (schema: Schema): string => {
    const generateMock = (s: Schema, key: string = ""): any => {
      if (s.type === 'object' && s.fields) {
        const obj: any = {};
        for (const [k, v] of Object.entries(s.fields)) {
          obj[k] = generateMock(v, k);
        }
        return obj;
      }
      if (s.type === 'array') {
        return [generateMock(s.itemType || { type: 'string' }, key), generateMock(s.itemType || { type: 'string' }, key), generateMock(s.itemType || { type: 'string' }, key)];
      }
      if (s.type === 'number') return key.toLowerCase().includes('id') ? 1 : 42;
      if (s.type === 'boolean') return true;
      if (s.type === 'string') {
        if (s.format === 'uuid') return 'uuid-1234-5678-9012';
        if (s.format === 'email') return 'test@example.com';
        if (s.format === 'url') return 'https://example.com/api';
        if (s.format === 'datetime') return new Date().toISOString();

        const k = key.toLowerCase();
        if (k.includes('name')) return 'John Doe';
        if (k.includes('email')) return 'john@example.com';
        if (k.includes('url') || k.includes('link')) return 'https://example.com';
        if (k.includes('id')) return 'uuid-1234-5678-9012';
        if (k.includes('date') || k.includes('time')) return new Date().toISOString();
        if (k.includes('city')) return 'Tokyo';
        if (k.includes('phone')) return '+81-90-1234-5678';
        if (k.includes('desc') || k.includes('memo') || k.includes('text')) return 'This is a sample generated text to simulate a realistic description or content block.';
        return 'sample_' + key;
      }
      return null;
    };
    return JSON.stringify(generateMock(schema), null, 2);
  }
};

export const csharpGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `public class ${name}\n{\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          const it = v.itemType?.type;
          const inner = it === 'object' ? toPascalCase(k) + 'Item'
            : it === 'number' ? 'double'
            : it === 'boolean' ? 'bool'
            : 'string';
          type = `List<${inner}>`;
        }
        else if (v.type === 'number') type = 'double';
        else if (v.type === 'boolean') type = 'bool';
        else type = 'string';
        res += `    public ${type} ${k} { get; set; }\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += csharpGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += csharpGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const swiftGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `struct ${name}: Codable {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          const it = v.itemType?.type;
          const inner = it === 'object' ? toPascalCase(k) + 'Item'
            : it === 'number' ? 'Double'
            : it === 'boolean' ? 'Bool'
            : 'String';
          type = `[${inner}]`;
        }
        else if (v.type === 'number') type = 'Double';
        else if (v.type === 'boolean') type = 'Bool';
        else type = 'String';
        res += `    let ${k}: ${type}\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += swiftGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += swiftGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const kotlinGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      const entries = Object.entries(schema.fields);
      let res = `data class ${name}(\n`;
      res += entries.map(([k, v]) => {
        let type: string;
        if (v.type === 'object') type = toPascalCase(k);
        else if (v.type === 'array') {
          const it = v.itemType?.type;
          const inner = it === 'object' ? toPascalCase(k) + 'Item'
            : it === 'number' ? 'Double'
            : it === 'boolean' ? 'Boolean'
            : 'String';
          type = `List<${inner}>`;
        }
        else if (v.type === 'number') type = 'Double';
        else if (v.type === 'boolean') type = 'Boolean';
        else type = 'String';
        return `    val ${k}: ${type}`;
      }).join(',\n');
      res += `\n)\n\n`;
      for (const [k, v] of entries) {
        if (v.type === 'object') res += kotlinGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += kotlinGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const jsonSchemaGen = {
  generate: (schema: Schema): string => {
    const build = (s: Schema): any => {
      if (s.type === 'object' && s.fields) {
        return {
          type: 'object',
          properties: Object.keys(s.fields).reduce((acc, k) => ({ ...acc, [k]: build(s.fields![k]) }), {})
        };
      }
      if (s.type === 'array') return { type: 'array', items: build(s.itemType!) };
      return { type: s.type };
    };
    return JSON.stringify({ 
      $schema: "http://json-schema.org/draft-07/schema#", 
      ...build(schema)
    }, null, 2);
  }
};

export const docGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `# API Field Specifications: ${name}\n\n`;
      res += `| Field | Type | Required | Description |\n`;
      res += `| :--- | :--- | :--- | :--- |\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const type = v.type === 'object' ? 'Object' : v.type === 'array' ? `${v.itemType?.type || 'any'}[]` : v.type;
        const required = 'Yes';
        
        // Intelligent descriptions based on field names
        let desc = 'No description provided.';
        const keyLower = k.toLowerCase();
        if (keyLower === 'id' || keyLower.endsWith('id')) desc = 'Unique identifier for the record.';
        else if (keyLower === 'username') desc = 'User\'s unique display name.';
        else if (keyLower === 'name' || keyLower === 'fullname') desc = 'Full name of the user or entity.';
        else if (keyLower === 'email') desc = 'Primary email address.';
        else if (keyLower === 'status') desc = 'Operational or lifecycle state.';
        else if (keyLower === 'role') desc = 'User privilege role or system role.';
        else if (keyLower === 'avatarurl' || keyLower === 'avatar') desc = 'Public URL to the user\'s avatar image.';
        else if (keyLower === 'stats') desc = 'Statistical metrics and counters.';
        else if (keyLower === 'preferences') desc = 'User preference flags and custom configurations.';
        else if (keyLower.startsWith('is') || keyLower.startsWith('has')) desc = 'Boolean flag representing status.';
        else if (keyLower === 'createdat' || keyLower === 'created_at') desc = 'Timestamp representing record creation time.';
        else if (keyLower === 'updatedat' || keyLower === 'updated_at') desc = 'Timestamp representing the last update time.';
        else if (keyLower === 'lastlogin' || keyLower === 'last_login') desc = 'Timestamp of the user\'s most recent session activity.';
        else if (v.format === 'uuid') desc = 'Universally Unique Identifier (UUID) format string.';
        else if (v.format === 'email') desc = 'Validated email format string.';
        else if (v.format === 'url') desc = 'Fully-qualified web URL (HTTP/HTTPS).';
        else if (v.format === 'datetime') desc = 'ISO 8601 compliant UTC date-time string.';
        
        res += `| \`${k}\` | \`${type}\` | ${required} | ${desc} |\n`;
      }
      res += `\n`;
      
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') {
          res += `\n---\n\n`;
          res += docGen.generate(v, k.charAt(0).toUpperCase() + k.slice(1));
        }
        if (v.type === 'array' && v.itemType?.type === 'object') {
          res += `\n---\n\n`;
          res += docGen.generate(v.itemType, k.charAt(0).toUpperCase() + k.slice(1) + 'Item');
        }
      }
      return res;
    }
    return "";
  }
};
