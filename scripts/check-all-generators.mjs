/**
 * TypeMorph 全ジェネレータ出力品質チェック
 * 各ジェネレータに同じテストデータを入力し、出力を確認する
 */
import { runEngine } from '../src/lib/engine.ts';

const TEST_JSON = {
  user: {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    avatar: "https://example.com/avatar.png",
    role: "admin",
    createdAt: "2026-05-18T10:00:00Z",
    updatedAt: "2026-05-18T12:00:00Z",
    address: {
      city: "Tokyo",
      street: "Shibuya",
      zip: "150-0002"
    }
  },
  items: [
    { id: 1, name: "Item A", price: 19.99 },
    { id: 2, name: "Item B", price: 29.99 }
  ]
};

// engine.ts の runEngine が受け付ける全ターゲット
const TARGETS = [
  // 主要言語
  'typescript', 'zod', 'go', 'rust', 'java', 'python', 'php',
  // データベース
  'sql', 'prisma', 'mysql', 'postgres', 'sqlite', 'snowflake',
  'drizzle', 'kysely', 'sequelize', 'typeorm', 'mongoose',
  'bigquery', 'dynamodb',
  // モバイル
  'swift', 'kotlin', 'dart', 'flutter',
  // .NET
  'csharp',
  // バリデーション
  'yup', 'joi', 'valibot', 'superstruct',
  // スキーマ
  'openapi', 'jsonschema', 'protobuf', 'graphql', 'avro',
  // フロントエンド
  'react-props', 'vue-props', 'svelte-props', 'solid-props',
  'react-context', 'redux-slice', 'pinia',
  // データ形式
  'csv', 'sql-insert', 'toml', 'yaml', 'env', 'properties',
  'markdown', 'asciidoc', 'latex',
  // ドキュメント/その他
  'mock', 'ui', 'doc', 'mermaid', 'postman', 'http', 'vscode',
  'curl',
  // ニッチ言語
  'cobol', 'clojure', 'elixir', 'elm', 'godot', 'haskell',
  'r', 'scala', 'solidity',
  // フレームワーク
  'django', 'ruby', 'rails', 'arduino',
];

const issues = [];

for (const target of TARGETS) {
  try {
    const result = runEngine(TEST_JSON, target);
    
    // 基本的な品質チェック
    const checks = [];
    
    // 1. 空でないこと
    if (!result || result.trim().length === 0) {
      checks.push('EMPTY_OUTPUT');
    }
    
    // 2. エラーメッセージでないこと
    if (result.startsWith('// Error:') || result.startsWith('// Unsupported')) {
      checks.push('ERROR_OR_UNSUPPORTED');
    }
    
    // 3. JSONフォールバックでないこと
    // 本質的にJSONを出力するターゲット（JSON Schema, Avro, Postman, VSCode Snippet,
    // BigQuery, DynamoDB）はJSONフォールバックチェックの対象外。
    // これらは出力がJSONであることが正しい。
    const nativeJsonTargets = new Set([
      'jsonschema', 'avro', 'postman', 'vscode', 'bigquery', 'dynamodb', 'mock'
    ]);
    const isJsonFallback = result.trim().startsWith('{') || result.trim().startsWith('[');
    const shouldNotFallback = ['typescript', 'zod', 'go', 'rust', 'java', 'python', 'php', 
      'swift', 'kotlin', 'dart', 'csharp', 'sql', 'prisma', 'protobuf', 'graphql',
      'openapi', 'yup', 'joi', 'valibot', 'superstruct',
      'drizzle', 'kysely', 'sequelize', 'typeorm', 'mongoose',
      'react-props', 'vue-props', 'svelte-props', 'solid-props',
      'react-context', 'redux-slice', 'pinia',
      'csv', 'sql-insert', 'toml', 'yaml', 'env', 'properties',
      'markdown', 'asciidoc', 'latex', 'mock', 'ui', 'doc', 'mermaid',
      'http', 'curl',
      'cobol', 'clojure', 'elixir', 'elm', 'godot', 'haskell',
      'r', 'scala', 'solidity', 'django', 'ruby', 'rails', 'arduino',
      'mysql', 'postgres', 'sqlite', 'snowflake'];
    if (isJsonFallback && shouldNotFallback.includes(target) && !nativeJsonTargets.has(target)) {
      checks.push('JSON_FALLBACK');
    }

    // 3b. ネイティブJSONターゲットの内容検証
    if (nativeJsonTargets.has(target) && !checks.includes('EMPTY_OUTPUT') && !checks.includes('ERROR_OR_UNSUPPORTED')) {
      try {
        const parsed = JSON.parse(result.trim());
        if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
          checks.push('EMPTY_JSON');
        }
      } catch {
        checks.push('INVALID_JSON');
      }
    }
    
    // 4. 出力の長さが極端に短い（10文字未満）
    if (result.trim().length < 10 && !checks.includes('EMPTY_OUTPUT')) {
      checks.push('TOO_SHORT');
    }
    
    if (checks.length > 0) {
      issues.push({ target, checks, preview: result.substring(0, 200) });
      console.log(`❌ ${target}: ${checks.join(', ')}`);
      console.log(`   Preview: ${result.substring(0, 150).replace(/\n/g, '\\n')}`);
    } else {
      const lines = result.split('\n').length;
      console.log(`✅ ${target} (${lines} lines, ${result.length} chars)`);
    }
  } catch (e) {
    issues.push({ target, checks: ['EXCEPTION'], preview: String(e) });
    console.log(`💥 ${target}: EXCEPTION - ${e.message}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total targets: ${TARGETS.length}`);
console.log(`Passed: ${TARGETS.length - issues.length}`);
console.log(`Issues: ${issues.length}`);

if (issues.length > 0) {
  console.log(`\n=== ISSUES DETAIL ===`);
  for (const issue of issues) {
    console.log(`\n[${issue.target}] ${issue.checks.join(', ')}`);
    console.log(`  ${issue.preview}`);
  }
}