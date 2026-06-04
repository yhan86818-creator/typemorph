const fs = require('fs');
let code = fs.readFileSync('src/lib/generators.ts', 'utf-8');

// 1. Add getBaseClass
const addPattern = "const toPascalCase = (str: string) => str.replace(/(^\\w|_\\w)/g, m => m.replace(/_/, '').toUpperCase());";
const getBaseClass = `
// annotations から継承元クラス名を取り出すヘルパー
const getBaseClass = (cls: ASTClass): string | null => {
  const ann = cls.annotations?.find(a => a.startsWith('extends '));
  return ann ? ann.slice('extends '.length) : null;
};
`;
code = code.replace(addPattern, addPattern + "\n" + getBaseClass);

// 2. Replace extendsAnn pattern
const target1 = `      const extendsAnn = cls.annotations?.find(a => a.startsWith('extends '));
      const baseClass = extendsAnn ? extendsAnn.replace('extends ', '') : null;`;
code = code.split(target1).join('      const baseClass = getBaseClass(cls);');

const target2 = `      const extendsAnn = cls.annotations?.find(a => a.startsWith('extends '));
      const baseClass = extendsAnn ? extendsAnn.replace('extends ', '') : 'BaseModel';`;
code = code.split(target2).join("      const baseClass = getBaseClass(cls) ?? 'BaseModel';");

const target3 = `      const extendsAnn = cls.annotations?.find(a => a.startsWith('extends '));
      const baseStruct = extendsAnn ? extendsAnn.replace('extends ', '') : null;`;
code = code.split(target3).join('      const baseStruct = getBaseClass(cls);');

// TS
const target4 = `      const extendsAnnotation = cls.annotations?.find(a => a.startsWith('extends '));
      const extendsStr = extendsAnnotation ? \` \${extendsAnnotation}\` : "";`;
code = code.split(target4).join('      const baseClass = getBaseClass(cls);\n      const extendsStr = baseClass ? \` extends \${baseClass}\` : "";');

// Zod
const target5 = `    const extendsAnn = cls.annotations?.find(a => a.startsWith('extends '));
    if (extendsAnn) {
      const baseName = extendsAnn.replace('extends ', '');`;
code = code.split(target5).join('    const baseName = getBaseClass(cls);\n    if (baseName) {');

// 3. csharpGen
const csharpOldStart = "export const csharpGen = {";
const csharpOld = code.substring(code.indexOf(csharpOldStart), code.indexOf("export const swiftGen") - 1).trim();

const csharpNew = `const printCsharpASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'object';
    case 'enum': return 'string';
    case 'date':
    case 'datetime': return 'DateTime';
    case 'classRef': return type.classRefName ?? 'object';
    case 'array':
      return type.itemType ? \`List<\${printCsharpASTType(type.itemType)}>\` : 'List<object>';
    case 'string': return 'string';
    case 'number': return type.format === 'int' ? 'long' : 'double';
    case 'boolean': return 'bool';
    default: return 'object';
  }
};

export const csharpGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? \` : \${baseClass}\` : '';
      res += \`public class \${cls.name}\${inheritance}\\n{\\n\`;
      for (const field of cls.fields) {
        const csType = printCsharpASTType(field.fieldType);
        const nullable = (field.isOptional || field.isNullable) ? '?' : '';
        res += \`    public \${csType}\${nullable} \${toPascalCase(field.name)} { get; set; }\\n\`;
      }
      res += \`}\\n\\n\`;
    }
    return res;
  }
};`;
code = code.replace(csharpOld, csharpNew);

// 4. swiftGen
const swiftOldStart = "export const swiftGen = {";
const swiftOld = code.substring(code.indexOf(swiftOldStart), code.indexOf("export const kotlinGen") - 1).trim();

const swiftNew = `const printSwiftASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'AnyCodable';
    case 'enum': return 'String';
    case 'date':
    case 'datetime': return 'Date';
    case 'classRef': return type.classRefName ?? 'AnyCodable';
    case 'array':
      return type.itemType ? \`[\${printSwiftASTType(type.itemType)}]\` : '[AnyCodable]';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? 'Int' : 'Double';
    case 'boolean': return 'Bool';
    default: return 'AnyCodable';
  }
};

export const swiftGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? \`: \${baseClass}\` : ': Codable';
      res += \`struct \${cls.name} \${inheritance} {\\n\`;
      for (const field of cls.fields) {
        let swiftType = printSwiftASTType(field.fieldType);
        if (field.isOptional || field.isNullable) swiftType += '?';
        res += \`    let \${field.name}: \${swiftType}\\n\`;
      }
      res += \`}\\n\\n\`;
    }
    return res;
  }
};`;
code = code.replace(swiftOld, swiftNew);

// 6. goGen
const goOld = 'let res = "package main\\n\\nimport \\"time\\"\\n\\n";';
const goNew = `const usesTime = astClasses.some(cls =>
  cls.fields.some(f => f.fieldType.kind === 'date' || f.fieldType.kind === 'datetime')
);
let res = usesTime
  ? "package main\\n\\nimport \\"time\\"\\n\\n"
  : "package main\\n\\n";`;
code = code.replace(goOld, goNew);

// 7. docGen
const docOld = "const required = 'Yes';";
const docNew = "const required = v.optional ? 'No' : 'Yes';";
code = code.replace(docOld, docNew);

// 8. mockGen
const mockOld = "return [generateMock(s.itemType || { type: 'string' }, key), generateMock(s.itemType || { type: 'string' }, key), generateMock(s.itemType || { type: 'string' }, key)];";
const mockNew = "const itemSchema = s.itemType || { type: 'string' };\n      return Array.from({ length: 3 }, () => generateMock(itemSchema, key));";
code = code.replace(mockOld, mockNew);

fs.writeFileSync('src/lib/generators.ts', code);
