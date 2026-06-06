// 確認用スクリプト: npx ts-node src/scripts/verify-output.ts
import { runEngine } from '../lib/engine';

const TEST_JSON = {
  "user_id": "u_9421",
  "metadata": {
    "tags": ["beta", "priority"],
    "last_login": "2024-05-20T10:00Z"
  },
  "permissions": [
    { "scope": "read", "exp": 3600 }
  ]
};

const LANGS = [
  'typescript',
  'zod',
  'go',
  'rust',
  'python',
  'dart',
  'php',
  'java',
  'kotlin',
  'swift',
  'protobuf',
  'graphql',
  'sql',
  'jsonschema',
  'doc',
  'mock',
] as const;

console.log('='.repeat(60));
console.log('TypeMorph Output Verification');
console.log('Input:', JSON.stringify(TEST_JSON, null, 2));
console.log('='.repeat(60));

for (const lang of LANGS) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`[${lang.toUpperCase()}]`);
  console.log('─'.repeat(50));
  try {
    const out = runEngine(TEST_JSON, lang, '', {});
    console.log(out);
  } catch (e: any) {
    console.log(`❌ ERROR: ${e.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('Done.');
