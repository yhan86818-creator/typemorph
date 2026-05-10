import { Schema } from './types';

const toPascalCase = (str: string) => str.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());

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
        if (v.type === 'array' && v.itemType?.type === 'object') res += goGen.generate(v.itemType, toPascalCase(k) + 'Item');
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
        const type = v.type === 'object' ? toPascalCase(k) : v.type === 'array' ? `Vec<${v.itemType?.type === 'object' ? toPascalCase(k) + 'Item' : v.itemType?.type === 'number' ? 'f64' : 'String'}>` : v.type === 'number' ? 'f64' : v.type === 'boolean' ? 'bool' : 'String';
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
        if (v.type === 'array' && v.itemType?.type === 'object') res += javaGen.generate(v.itemType, toPascalCase(k) + 'Item');
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
    res += `/**\n * TypeFlow Generated UI Component (Tailwind CSS)\n */\n`;
    
    // Generate Card Version
    res += `export const ${name}Card = ({ data }: { data: any }) => {\n`;
    res += `  return (\n`;
    res += `    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">\n`;
    res += `      <div className="flex items-center justify-between mb-6">\n`;
    res += `        <h3 className="text-xl font-black tracking-tight dark:text-white">${name} Details</h3>\n`;
    res += `        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-widest">Active</span>\n`;
    res += `      </div>\n`;
    res += `      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">\n`;
    
    keys.slice(0, 10).forEach(k => {
      res += `        <div className="space-y-1">\n`;
      res += `          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">${k}</p>\n`;
      res += `          <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{String(data?.${k} || '-')}</p>\n`;
      res += `        </div>\n`;
    });
    
    res += `      </div>\n`;
    res += `    </div>\n`;
    res += `  );\n};\n\n`;

    // Generate Table Version
    res += `export const ${name}Table = ({ items }: { items: any[] }) => {\n`;
    res += `  return (\n`;
    res += `    <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">\n`;
    res += `      <table className="w-full text-left border-collapse">\n`;
    res += `        <thead className="bg-slate-50 dark:bg-slate-800/50">\n`;
    res += `          <tr>\n`;
    keys.slice(0, 5).forEach(k => {
      res += `            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 dark:border-slate-800">${k}</th>\n`;
    });
    res += `          </tr>\n`;
    res += `        </thead>\n`;
    res += `        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">\n`;
    res += `          {items.map((item, i) => (\n`;
    res += `            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">\n`;
    keys.slice(0, 5).forEach(k => {
      res += `              <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-200">{String(item?.${k} || '-')}</td>\n`;
    });
    res += `            </tr>\n`;
    res += `          ))}\n`;
    res += `        </tbody>\n`;
    res += `      </table>\n`;
    res += `    </div>\n`;
    res += `  );\n};`;
    
    return res;
  }
};
