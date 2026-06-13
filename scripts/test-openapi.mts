import { runEngine } from '../src/lib/engine';
import https from 'https';

const URLS: { label: string; url: string }[] = [
  {
    label: 'Petstore 3.0',
    url: 'https://petstore3.swagger.io/api/v3/openapi.json',
  },
];

async function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

for (const { label, url } of URLS) {
  console.log(`\n=== ${label} ===`);
  try {
    const text = await fetchText(url);
    const spec = JSON.parse(text);
    console.log(`openapi: ${spec.openapi}`);
    const schemas = Object.keys(spec.components?.schemas ?? spec.definitions ?? {});
    console.log(`schemas (${schemas.length}): ${schemas.join(', ')}`);

    const out = runEngine(spec, 'typescript', '', {});
    console.log('\n--- TypeScript output (first 2000 chars) ---');
    console.log(out.slice(0, 2000));
  } catch (e) {
    console.error('Error:', e);
  }
}
