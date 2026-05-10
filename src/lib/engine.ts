
/**
 * TypeFlow Ultimate Engine - Enterprise Grade Data Inference
 * Features: Deep Recursion, Parent-Aware Naming, Smart Union Detection, Multi-Target Generation
 */

export type InferredType = {
  kind: 'primitive' | 'object' | 'array' | 'null' | 'unknown' | 'union';
  type: string;
  name?: string;
  properties?: Record<string, InferredType>;
  items?: InferredType[]; // For arrays or unions
  isOptional?: boolean;
};

const isDate = (str: string) => !isNaN(Date.parse(str)) && str.length > 10;
const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
const isURL = (str: string) => /^https?:\/\/.+/.test(str);

/**
 * Step 1: Infer a structured schema from raw data with Parent-Aware Naming
 */
export function inferSchema(data: any, nameHint: string = "Root", parentName: string = ""): InferredType {
  const currentName = parentName ? `${parentName}${nameHint.charAt(0).toUpperCase() + nameHint.slice(1)}` : nameHint;

  if (data === null) return { kind: 'null', type: 'null' };
  
  if (Array.isArray(data)) {
    if (data.length === 0) return { kind: 'array', type: 'any[]', items: [{ kind: 'unknown', type: 'any' }] };
    
    const schemas = data.map((item, i) => inferSchema(item, nameHint, parentName));
    
    // Check if all items are objects - then merge them
    if (schemas.every(s => s.kind === 'object')) {
      const mergedProps: Record<string, InferredType> = {};
      const allKeys = new Set<string>();
      schemas.forEach(s => Object.keys(s.properties!).forEach(k => allKeys.add(k)));
      
      allKeys.forEach(key => {
        const variants = schemas.map(s => s.properties![key]).filter(Boolean);
        if (variants.length < schemas.length) {
          const base = variants[0];
          mergedProps[key] = { ...base, isOptional: true };
        } else {
          // Check for type consistency within the same property across array items
          const types = new Set(variants.map(v => v.type));
          if (types.size > 1) {
             mergedProps[key] = { kind: 'union', type: Array.from(types).join(' | '), items: variants };
          } else {
             mergedProps[key] = variants[0];
          }
        }
      });
      
      return { 
        kind: 'array', 
        type: `${currentName}[]`, 
        items: [{ kind: 'object', type: currentName, properties: mergedProps, name: currentName }] 
      };
    }
    
    // Otherwise, treat as Union of types
    const uniqueTypes = Array.from(new Set(schemas.map(s => s.type)));
    return { 
        kind: 'array', 
        type: `${uniqueTypes.join(' | ')}[]`, 
        items: schemas.length > 1 ? [{ kind: 'union', type: uniqueTypes.join(' | '), items: schemas }] : [schemas[0]] 
    };
  }
  
  if (typeof data === 'object') {
    const properties: Record<string, InferredType> = {};
    for (const key in data) {
      properties[key] = inferSchema(data[key], key, currentName);
    }
    return { kind: 'object', type: currentName, properties, name: currentName };
  }
  
  let type: string = typeof data;
  if (type === 'string') {
    if (isDate(data)) type = 'Date';
    else if (isEmail(data)) type = 'email';
    else if (isUUID(data)) type = 'uuid';
    else if (isURL(data)) type = 'url';
  }
  
  return { kind: 'primitive', type };
}

/**
 * Step 2: Language-Specific Generators
 */

// Base Generator for shared logic
abstract class BaseGenerator {
    protected definitions: Map<string, string> = new Map();
    abstract generate(schema: InferredType): string;
}

export class TypeScriptGenerator extends BaseGenerator {
  generate(schema: InferredType): string {
    this.definitions.clear();
    const mainType = this.process(schema);
    let result = "";
    this.definitions.forEach((body, name) => {
      result += `export interface ${name} {\n${body}}\n\n`;
    });
    return (result || `export type Root = ${mainType};`).trim();
  }

  private process(schema: InferredType): string {
    if (schema.kind === 'primitive') {
      if (['email', 'uuid', 'url'].includes(schema.type)) return 'string';
      return schema.type;
    }
    if (schema.kind === 'null') return 'null';
    if (schema.kind === 'union') return schema.type;
    if (schema.kind === 'array') return `${this.process(schema.items![0])}[]`;
    
    if (schema.kind === 'object') {
      let body = "";
      for (const key in schema.properties) {
        const prop = schema.properties[key];
        body += `  ${key}${prop.isOptional ? '?' : ''}: ${this.process(prop)};\n`;
      }
      this.definitions.set(schema.name!, body);
      return schema.name!;
    }
    return 'any';
  }
}

export class GoGenerator extends BaseGenerator {
    generate(schema: InferredType): string {
        this.definitions.clear();
        this.process(schema, schema.name || "Root");
        let result = "package main\n\n";
        this.definitions.forEach((body, n) => {
            result += `type ${n} struct {\n${body}}\n\n`;
        });
        return result.trim();
    }

    private process(schema: InferredType, name: string): string {
        if (schema.kind === 'primitive') {
            if (schema.type === 'number') return "float64";
            if (schema.type === 'boolean') return "bool";
            return "string";
        }
        if (schema.kind === 'array') return `[]${this.process(schema.items![0], name + "Item")}`;
        if (schema.kind === 'object') {
            let body = "";
            for (const key in schema.properties) {
                const prop = schema.properties[key];
                const goKey = key.charAt(0).toUpperCase() + key.slice(1);
                body += `\t${goKey} ${this.process(prop, goKey)} \`json:"${key}${prop.isOptional ? ',omitempty' : ''}"\`\n`;
            }
            this.definitions.set(name, body);
            return name;
        }
        return "interface{}";
    }
}

export class RustGenerator extends BaseGenerator {
    generate(schema: InferredType): string {
        this.definitions.clear();
        this.process(schema, schema.name || "Root");
        let result = "use serde::{Serialize, Deserialize};\n\n";
        this.definitions.forEach((body, n) => {
            result += `#[derive(Serialize, Deserialize, Debug)]\npub struct ${n} {\n${body}}\n\n`;
        });
        return result.trim();
    }

    private process(schema: InferredType, name: string): string {
        if (schema.kind === 'primitive') {
            if (schema.type === 'number') return "f64";
            if (schema.type === 'boolean') return "bool";
            return "String";
        }
        if (schema.kind === 'array') return `Vec<${this.process(schema.items![0], name + "Item")}>`;
        if (schema.kind === 'object') {
            let body = "";
            for (const key in schema.properties) {
                const prop = schema.properties[key];
                const type = this.process(prop, key.charAt(0).toUpperCase() + key.slice(1));
                body += `    pub ${key}: ${prop.isOptional ? `Option<${type}>` : type},\n`;
            }
            this.definitions.set(name, body);
            return name;
        }
        return "serde_json::Value";
    }
}

export class JavaGenerator extends BaseGenerator {
    generate(schema: InferredType): string {
        this.definitions.clear();
        this.process(schema, schema.name || "Root");
        let result = "";
        this.definitions.forEach((body, n) => {
            result += `public class ${n} {\n${body}}\n\n`;
        });
        return result.trim();
    }

    private process(schema: InferredType, name: string): string {
        if (schema.kind === 'primitive') {
            if (schema.type === 'number') return "Double";
            if (schema.type === 'boolean') return "Boolean";
            return "String";
        }
        if (schema.kind === 'array') return `List<${this.process(schema.items![0], name + "Item")}>`;
        if (schema.kind === 'object') {
            let body = "";
            for (const key in schema.properties) {
                const prop = schema.properties[key];
                const type = this.process(prop, key.charAt(0).toUpperCase() + key.slice(1));
                body += `    private ${type} ${key};\n`;
            }
            this.definitions.set(name, body);
            return name;
        }
        return "Object";
    }
}

export class ZodGenerator extends BaseGenerator {
    generate(schema: InferredType): string {
        return `import { z } from "zod";\n\nexport const RootSchema = ${this.process(schema)};`;
    }

    private process(s: InferredType): string {
        if (s.kind === 'primitive') {
            let base = `z.${s.type === 'Date' ? 'date()' : s.type === 'number' ? 'number()' : s.type === 'boolean' ? 'boolean()' : 'string()'}`;
            if (s.type === 'email') base += ".email()";
            if (s.type === 'uuid') base += ".uuid()";
            if (s.type === 'url') base += ".url()";
            return s.isOptional ? `${base}.optional()` : base;
        }
        if (s.kind === 'null') return 'z.null()';
        if (s.kind === 'array') return `z.array(${this.process(s.items![0])})`;
        if (s.kind === 'object') {
            let body = "z.object({\n";
            for (const key in s.properties) {
                body += `  ${key}: ${this.process(s.properties[key])},\n`;
            }
            body += "})";
            return s.isOptional ? `${body}.optional()` : body;
        }
        return "z.any()";
    }
}

export class PrismaGenerator extends BaseGenerator {
    generate(schema: InferredType): string {
        this.definitions.clear();
        this.process(schema, schema.name || "Root");
        let result = "datasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n";
        this.definitions.forEach((body, n) => {
            result += `model ${n} {\n  id Int @id @default(autoincrement())\n${body}}\n\n`;
        });
        return result.trim();
    }

    private process(schema: InferredType, name: string): string {
        if (schema.kind === 'object') {
            let body = "";
            for (const key in schema.properties) {
                const prop = schema.properties[key];
                let pType = "String";
                if (prop.kind === 'primitive') {
                   if (prop.type === 'number') pType = "Float";
                   else if (prop.type === 'boolean') pType = "Boolean";
                   else if (prop.type === 'Date') pType = "DateTime";
                } else if (prop.kind === 'object') {
                   pType = this.process(prop, key.charAt(0).toUpperCase() + key.slice(1));
                }
                body += `  ${key} ${pType}${prop.isOptional ? '?' : ''}\n`;
            }
            this.definitions.set(name, body);
            return name;
        }
        return "Json";
    }
}
