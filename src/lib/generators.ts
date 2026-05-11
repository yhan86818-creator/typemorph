import { Schema } from './types';

const toPascalCase = (str: string) => str.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());

// Existing Generators (Improved)
export const tsGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `export interface ${name} {\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        res += `  ${k}: ${v.type === 'object' ? toPascalCase(k) : v.type === 'array' ? (v.itemType?.type === 'object' ? `${toPascalCase(k)}Item[]` : `${v.itemType?.type}[]`) : v.type};\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += tsGen.generate(v, toPascalCase(k));
        if (v.type === 'array' && v.itemType?.type === 'object') res += tsGen.generate(v.itemType, toPascalCase(k) + 'Item');
      }
      return res;
    }
    return "";
  }
};

export const zodGen = {
  generate: (schema: Schema, name: string = 'root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `export const ${name}Schema = z.object({\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        res += `  ${k}: ${v.type === 'object' ? `${k}Schema` : v.type === 'array' ? `z.array(${v.itemType?.type === 'object' ? `${k}ItemSchema` : `z.${v.itemType?.type}()`})` : `z.${v.type}()`},\n`;
      }
      res += `});\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += zodGen.generate(v, k);
        if (v.type === 'array' && v.itemType?.type === 'object') res += zodGen.generate(v.itemType, k + 'Item');
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
        const type = v.type === 'object' ? toPascalCase(k) : v.type === 'array' ? `List<${v.itemType?.type === 'object' ? toPascalCase(k) : 'dynamic'}>` : v.type === 'number' ? 'double' : v.type === 'boolean' ? 'bool' : 'String';
        res += `  final ${type} ${k};\n`;
      }
      res += `\n  ${name}({required this.fields...}); // Generated Constructor\n`;
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += dartGen.generate(v, toPascalCase(k));
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
        const type = v.type === 'number' ? 'float' : v.type === 'boolean' ? 'bool' : 'string';
        res += `    public ${type} $${k};\n`;
      }
      res += `}\n\n`;
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
        const type = v.type === 'number' ? 'float' : v.type === 'boolean' ? 'bool' : 'str';
        res += `    ${k}: ${type}\n`;
      }
      res += `\n`;
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
        const type = v.type === 'number' ? 'double' : v.type === 'boolean' ? 'bool' : 'string';
        res += `  ${type} ${k} = ${i++};\n`;
      }
      res += `}\n\n`;
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
        const type = v.type === 'number' ? 'Float' : v.type === 'boolean' ? 'Boolean' : 'String';
        res += `  ${k}: ${type}\n`;
      }
      res += `}\n\n`;
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
        const type = v.type === 'object' ? toPascalCase(k) : v.type === 'array' ? `Vec<${v.itemType?.type === 'object' ? toPascalCase(k) + 'Item' : v.itemType?.type === 'number' ? 'f64' : 'String'}>` : v.type === 'number' ? 'f64' : v.type === 'boolean' ? 'bool' : 'String';
        res += `  pub ${k}: ${type},\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += rustGen.generate(v, toPascalCase(k));
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
        const type = v.type === 'object' ? toPascalCase(k) : v.type === 'array' ? `[]${v.itemType?.type === 'object' ? toPascalCase(k) + 'Item' : v.itemType?.type}` : v.type === 'number' ? 'float64' : v.type === 'boolean' ? 'bool' : 'string';
        res += `  ${toPascalCase(k)} ${type} \`json:"${k}"\`\n`;
      }
      res += `}\n\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') res += goGen.generate(v, toPascalCase(k));
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
