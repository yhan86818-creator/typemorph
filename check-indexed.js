const fs = require('fs');
const path = require('path');

// These are all the slugs currently in INDEXED_EN_SLUGS
const indexedSlugs = new Set([
  'json-to-typescript', 'json-to-zod', 'curl-to-fetch', 'json-to-valibot', 'json-to-arktype',
  'typescript-to-zod', 'typescript-to-json-schema',
  'sql-to-zod', 'json-to-prisma-schema', 'json-to-drizzle-schema', 'json-to-kysely-schema',
  'json-to-mongoose-model', 'json-to-postgres-schema', 'json-to-mysql-schema',
  'json-to-sqlite-schema', 'json-to-mongodb-schema',
  'json-to-go-struct', 'json-to-rust-struct', 'json-to-java-class', 'json-to-python-dataclass',
  'json-to-csharp-class', 'json-to-dart-class', 'json-to-kotlin-class', 'json-to-swift-struct',
  'json-to-php-dto-class', 'json-to-elixir-struct', 'json-to-lua-table',
  'fix-to-typescript', 'fix-to-json', 'swift-to-typescript', 'swift-mt-to-mx',
  'swift-mt103-to-json', 'iso-20022-to-typescript', 'protobuf-to-typescript', 'graphql-to-typescript',
  'json-to-openapi-3', 'json-to-openapi-definition', 'json-to-asyncapi-definition',
  'json-to-json-api-spec', 'json-to-yaml', 'json-to-toml', 'dotenv-to-json', 'env-to-typescript',
  'json-to-jest-test', 'json-to-playwright-test', 'json-to-cypress-test',
  'json-to-postman-collection', 'json-to-insomnia-export',
  'csv-to-json', 'csv-to-typescript', 'xml-to-json', 'xml-to-typescript', 'csv-to-sql',
  'json-to-bigquery-schema', 'json-to-terraform-resource', 'json-to-snowflake-table',
  'json-to-docker-compose', 'json-to-swiftui-preview', 'json-to-jetpack-compose-preview',
  'json-to-styled-components', 'json-to-tailwind-config', 'json-to-avro-avsc',
  'json-to-clickhouse-table', 'json-to-neo4j-cypher', 'json-to-pydantic', 'json-to-laravel-migration',
  'json-to-django-model', 'json-to-rails-migration', 'json-to-mermaid', 'json-to-latex-table',
  'json-to-markdown-table', 'json-to-proto-definition', 'json-to-grpc-web',
  'json-to-react-query', 'json-to-redux-slice', 'json-to-pinia-store', 'json-to-supabase-type',
  'json-to-pocketbase-type', 'json-to-lucia-auth-schema', 'json-to-nextauth-config',
  'json-to-scala-case-class', 'json-to-elm-decoder', 'json-to-ruby-struct',
  'json-to-graphql-resolver', 'json-to-django-rest-serializer', 'json-to-spring-boot-jpa',
  'json-to-csharp-dto', 'json-to-superstruct', 'json-to-joi', 'json-to-ajv',
  'json-to-knex-migration', 'json-to-typeorm-entity', 'json-to-yup',
  'json-to-solidity', 'json-to-arduino', 'json-to-godot-gdscript', 'json-to-r-dataframe',
  'json-to-haskell-type', 'yaml-to-rust', 'toml-to-typescript',
]);

const dir = './src/data/content';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

console.log('=== INDEXED slugs with problems ===\n');
let problems = [];

files.forEach(f => {
  const slug = f.replace('.html', '');
  if (!indexedSlugs.has(slug)) return;

  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const hasDevDiary = c.includes('Dev Diary');
  const hasTypeFlow = c.toLowerCase().includes('typeflow');
  const size = c.length;

  if (hasDevDiary || hasTypeFlow) {
    problems.push({ file: f, hasDevDiary, hasTypeFlow, size });
    console.log(`${f}  [size: ${size}b]  [Dev Diary: ${hasDevDiary}]  [TypeFlow: ${hasTypeFlow}]`);
    // Show first 200 chars
    console.log('  Preview:', c.substring(0, 150).replace(/\n/g, ' '));
    console.log('');
  }
});

console.log(`\nTotal problems in indexed files: ${problems.length}`);
