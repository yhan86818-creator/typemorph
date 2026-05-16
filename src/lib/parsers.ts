/**
 * TypeFlow Parser Utilities
 * Handles extraction of data from various formats (YAML, XML, CURL, SQL)
 */

export const parseYAML = (str: string) => {
  const obj: any = {};
  str.split('\n').forEach(line => {
    const [k, v] = line.split(':').map(s => s.trim());
    if (k && v) obj[k] = isNaN(Number(v)) ? v : Number(v);
  });
  return obj;
};

export const parseXML = (str: string) => {
  const match = str.match(/<(\w+)>([^<]+)<\/\1>/g);
  const obj: any = {};
  match?.forEach(m => {
    const k = m.match(/<(\w+)>/)?.[1];
    const v = m.match(/>([^<]+)</)?.[1];
    if (k && v) obj[k] = isNaN(Number(v)) ? v : Number(v);
  });
  return obj;
};

export const parseCurl = (curl: string) => {
  const method = curl.match(/-X\s+(\w+)/)?.[1] || 'GET';
  const url = curl.match(/'(https?:\/\/[^']+)'/)?.[1] || curl.match(/"(https?:\/\/[^"]+)"/)?.[1] || "";
  const headers: any = {};
  const headerMatches = curl.matchAll(/-H\s+'([^']+)'/g);
  for (const m of headerMatches) {
    const [k, v] = m[1].split(':').map(s => s.trim());
    headers[k] = v;
  }
  const bodyMatch = curl.match(/-d\s+'([^']+)'/);
  let bodyJson = null;
  if (bodyMatch) {
    try { bodyJson = JSON.parse(bodyMatch[1]); } catch(e) {}
  }
  return { method, url, headers, body: bodyMatch?.[1] || "", bodyJson };
};

export const parseSQLToZod = (sql: string) => {
  const tableName = sql.match(/CREATE TABLE (\w+)/)?.[1] || 'Schema';
  const columns = sql.matchAll(/(\w+)\s+(\w+)/g);
  let out = `export const ${tableName}Schema = z.object({\n`;
  for (const col of columns) {
    if (['CREATE', 'TABLE', 'PRIMARY', 'KEY', 'NOT', 'NULL'].includes(col[1].toUpperCase())) continue;
    const type = col[2].toUpperCase();
    let zodType = 'z.string()';
    if (['INT', 'INTEGER', 'FLOAT', 'DECIMAL'].includes(type)) zodType = 'z.number()';
    if (['BOOLEAN', 'BOOL'].includes(type)) zodType = 'z.boolean()';
    out += `  ${col[1]}: ${zodType},\n`;
  }
  out += `});`;
  return out;
};

export const curlToTypeScript = (parsed: any) => {
  const { method, url, headers, body, bodyJson } = parsed;
  let out = `/**\n * TypeFlow Generated React Hook\n */\n`;
  out += `export const useApiCall = async () => {\n`;
  if (Object.keys(headers).length > 0) {
    out += `  const headers = ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')};\n\n`;
  }
  out += `  const res = await fetch('${url}', {\n`;
  out += `    method: '${method}',\n`;
  if (Object.keys(headers).length > 0) out += `    headers,\n`;
  if (body) out += `    body: ${bodyJson ? 'JSON.stringify(body)' : `'${body}'`},\n`;
  out += `  });\n\n`;
  out += `  return await res.json();\n`;
  out += `};`;
  return out;
};
