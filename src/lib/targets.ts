/**
 * TypeMorph Output Target Registry
 * ---------------------------------
 * runEngine() がサポートする出力ターゲットの正準定義と、
 * コンバータ slug から「そのページが約束している出力形式」を解決する仕組み。
 *
 * 設計方針（安価配線＋ティア運用）:
 *  - 各 /converters/<slug> ページは、その slug が約束する形式を必ず出力タブとして表示する。
 *  - Tier 1 = 十分にテストされた中核ジェネレータ。Tier 2 = 近似的なスキャフォールド出力。
 *  - runEngine が未対応の slug は null を返し、呼び出し側で 'typescript' にフォールバックする。
 *    （未対応形式の slug は別途 noindex / ジェネレータ実装の判断対象）
 */

export type TargetTier = 1 | 2;

export interface OutputTarget {
  /** runEngine に渡すルーティングキー（= 出力タブ id） */
  key: string;
  /** UI ラベル */
  label: string;
  /** 品質ティア */
  tier: TargetTier;
  /** Monaco エディタのシンタックスハイライト言語 */
  monaco: string;
}

const T = (key: string, label: string, tier: TargetTier, monaco: string): OutputTarget => ({ key, label, tier, monaco });

export const OUTPUT_TARGETS: Record<string, OutputTarget> = {
  // ─── Tier 1: 中核（テスト済み） ───────────────────────────────
  typescript: T('typescript', 'TypeScript', 1, 'typescript'),
  zod:        T('zod', 'Zod', 1, 'typescript'),
  go:         T('go', 'Go', 1, 'go'),
  rust:       T('rust', 'Rust', 1, 'rust'),
  python:     T('python', 'Python', 1, 'python'),
  java:       T('java', 'Java', 1, 'java'),
  csharp:     T('csharp', 'C#', 1, 'csharp'),
  swift:      T('swift', 'Swift', 1, 'swift'),
  kotlin:     T('kotlin', 'Kotlin', 1, 'kotlin'),
  php:        T('php', 'PHP', 1, 'php'),
  dart:       T('dart', 'Dart', 1, 'dart'),
  graphql:    T('graphql', 'GraphQL', 1, 'graphql'),
  protobuf:   T('protobuf', 'Protobuf', 1, 'protobuf'),
  jsonschema: T('jsonschema', 'JSON Schema', 1, 'json'),
  sql:        T('sql', 'Prisma', 1, 'prisma'),

  // ─── Tier 2: スキャフォールド / 近似出力 ──────────────────────
  mongoose:        T('mongoose', 'Mongoose', 2, 'typescript'),
  mysql:           T('mysql', 'MySQL', 2, 'sql'),
  postgres:        T('postgres', 'PostgreSQL', 2, 'sql'),
  sqlite:          T('sqlite', 'SQLite', 2, 'sql'),
  snowflake:       T('snowflake', 'Snowflake', 2, 'sql'),
  bigquery:        T('bigquery', 'BigQuery', 2, 'sql'),
  dynamodb:        T('dynamodb', 'DynamoDB', 2, 'json'),
  sequelize:       T('sequelize', 'Sequelize', 2, 'typescript'),
  typeorm:         T('typeorm', 'TypeORM', 2, 'typescript'),
  drizzle:         T('drizzle', 'Drizzle', 2, 'typescript'),
  kysely:          T('kysely', 'Kysely', 2, 'typescript'),
  'sql-insert':    T('sql-insert', 'SQL INSERT', 2, 'sql'),
  yup:             T('yup', 'Yup', 2, 'typescript'),
  joi:             T('joi', 'Joi', 2, 'typescript'),
  valibot:         T('valibot', 'Valibot', 2, 'typescript'),
  superstruct:     T('superstruct', 'Superstruct', 2, 'typescript'),
  'react-props':   T('react-props', 'React Props', 2, 'typescript'),
  'react-context': T('react-context', 'React Context', 2, 'typescript'),
  'react-query':   T('react-query', 'React Query', 2, 'typescript'),
  'vue-props':     T('vue-props', 'Vue Props', 2, 'typescript'),
  'svelte-props':  T('svelte-props', 'Svelte Props', 2, 'typescript'),
  'solid-props':   T('solid-props', 'Solid Props', 2, 'typescript'),
  'redux-slice':   T('redux-slice', 'Redux Slice', 2, 'typescript'),
  pinia:           T('pinia', 'Pinia', 2, 'typescript'),
  'api-route':     T('api-route', 'Next.js API', 2, 'typescript'),
  django:          T('django', 'Django', 2, 'python'),
  rails:           T('rails', 'Rails', 2, 'ruby'),
  openapi:         T('openapi', 'OpenAPI', 2, 'yaml'),
  postman:         T('postman', 'Postman', 2, 'json'),
  http:            T('http', 'HTTP File', 2, 'http'),
  curl:            T('curl', 'cURL', 2, 'shell'),
  vscode:          T('vscode', 'VS Code Snippet', 2, 'json'),
  avro:            T('avro', 'Avro', 2, 'json'),
  toml:            T('toml', 'TOML', 2, 'ini'),
  yaml:            T('yaml', 'YAML', 2, 'yaml'),
  env:             T('env', '.env', 2, 'shell'),
  'env-validator': T('env-validator', 'Env Validator', 2, 'typescript'),
  properties:      T('properties', '.properties', 2, 'ini'),
  markdown:        T('markdown', 'Markdown', 2, 'markdown'),
  asciidoc:        T('asciidoc', 'AsciiDoc', 2, 'markdown'),
  latex:           T('latex', 'LaTeX', 2, 'latex'),
  mermaid:         T('mermaid', 'Mermaid', 2, 'markdown'),
  csv:             T('csv', 'CSV', 2, 'plaintext'),
  cobol:           T('cobol', 'COBOL', 2, 'plaintext'),
  clojure:         T('clojure', 'Clojure', 2, 'clojure'),
  elixir:          T('elixir', 'Elixir', 2, 'elixir'),
  elm:             T('elm', 'Elm', 2, 'elm'),
  godot:           T('godot', 'GDScript', 2, 'plaintext'),
  haskell:         T('haskell', 'Haskell', 2, 'haskell'),
  'r-lang':        T('r-lang', 'R', 2, 'r'),
  scala:           T('scala', 'Scala', 2, 'scala'),
  solidity:        T('solidity', 'Solidity', 2, 'sol'),
  arduino:         T('arduino', 'Arduino', 2, 'cpp'),
  c:               T('c', 'C Struct', 2, 'c'),
  cpp:             T('cpp', 'C++ Struct', 2, 'cpp'),
  'mcp-tool':      T('mcp-tool', 'MCP Tool', 2, 'typescript'),
  'openai-function': T('openai-function', 'OpenAI Function', 2, 'json'),
  'vercel-ai-tool': T('vercel-ai-tool', 'Vercel AI Tool', 2, 'typescript'),
};

/**
 * slug の "-to-<tail>" 部分から出力ターゲットを解決する。
 * パターンは「具体 → 汎用」の順で評価し、最初にマッチしたものを採用する
 * （例: "mongoose-model" が 'go'(mon-GO-ose) に誤マッチしないよう mongoose を先に置く）。
 */
const ALIASES: [RegExp, string][] = [
  // --- validation libraries ---
  [/valibot/, 'valibot'],
  [/superstruct/, 'superstruct'],
  [/\bzod\b|-zod\b/, 'zod'],
  [/\byup\b/, 'yup'],
  [/\bjoi\b/, 'joi'],
  // --- ORM / database (specific) ---
  [/mongoose|mongodb/, 'mongoose'],
  [/sequelize/, 'sequelize'],
  [/typeorm/, 'typeorm'],
  [/drizzle/, 'drizzle'],
  [/kysely/, 'kysely'],
  [/prisma/, 'sql'],
  [/mariadb|mysql/, 'mysql'],
  [/postgres/, 'postgres'],
  [/sqlite/, 'sqlite'],
  [/snowflake/, 'snowflake'],
  [/bigquery/, 'bigquery'],
  [/dynamodb/, 'dynamodb'],
  [/sql-insert|csv-to-sql/, 'sql-insert'],
  // --- frontend frameworks (specific) ---
  [/react-context/, 'react-context'],
  [/react-query|tanstack/, 'react-query'],
  [/react-props|react-native|^react|reactprops/, 'react-props'],
  [/vue-props|^vue|pinia-store/, 'vue-props'],
  [/svelte/, 'svelte-props'],
  [/solid/, 'solid-props'],
  [/redux/, 'redux-slice'],
  [/\bpinia\b/, 'pinia'],
  [/nextjs-api|api-route/, 'api-route'],
  // --- backend frameworks (before generic language) ---
  [/django/, 'django'],
  [/rails|ruby/, 'rails'],
  [/laravel|php/, 'php'],
  [/spring-boot|nestjs-dto|java/, 'java'],
  // --- documents / data formats ---
  [/openapi|swagger|asyncapi/, 'openapi'],
  [/postman/, 'postman'],
  [/http-file|\bhttp\b/, 'http'],
  [/\bcurl\b/, 'curl'],
  [/vscode/, 'vscode'],
  [/avro/, 'avro'],
  [/hugo-toml|\btoml\b/, 'toml'],
  [/jekyll-yaml|\byaml\b/, 'yaml'],
  [/env-validator|env-zod/, 'env-validator'],
  [/dotenv|\benv\b/, 'env'],
  [/properties/, 'properties'],
  [/markdown/, 'markdown'],
  [/asciidoc/, 'asciidoc'],
  [/latex/, 'latex'],
  [/mermaid/, 'mermaid'],
  [/\bcsv\b/, 'csv'],
  // --- languages (generic, last) ---
  [/protobuf|proto/, 'protobuf'],
  [/graphql|gql/, 'graphql'],
  [/jsonschema/, 'jsonschema'],
  [/cobol/, 'cobol'],
  [/clojure/, 'clojure'],
  [/elixir/, 'elixir'],
  [/\belm\b/, 'elm'],
  [/godot|gdscript/, 'godot'],
  [/haskell/, 'haskell'],
  [/r-dataframe|r-lang|\br\b/, 'r-lang'],
  [/scala/, 'scala'],
  [/solidity/, 'solidity'],
  [/arduino/, 'arduino'],
  [/\bc-struct\b|json-to-c\b/, 'c'],
  [/cpp-struct|cpp-class|\bcpp\b|c\+\+/, 'cpp'],
  [/pydantic|dataclass|sqlalchemy|marshmallow|pandas|pytorch|tensorflow|python/, 'python'],
  [/golang|gorm|go-fiber|go-struct|go-map|\bgo\b/, 'go'],
  [/rust/, 'rust'],
  [/flutter|dart/, 'dart'],
  [/kotlin|jetpack-compose/, 'kotlin'],
  [/swiftui|swift/, 'swift'],
  [/unity|csharp|c-sharp|\bcs\b/, 'csharp'],
  [/typescript|\bts\b/, 'typescript'],
  // --- AI & LLM Tools ---
  [/mcp-tool|\bmcp\b/, 'mcp-tool'],
  [/openai-function|openai-func/, 'openai-function'],
  [/vercel-ai-tool|vercel-ai/, 'vercel-ai-tool'],
];

export function resolveSlugTarget(slug: string): OutputTarget | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  const tail = lower.includes('-to-') ? lower.split('-to-').pop()! : lower;
  for (const [re, key] of ALIASES) {
    if (re.test(tail)) return OUTPUT_TARGETS[key] ?? null;
  }
  return null;
}

/**
 * Monaco の言語識別子を返す。
 * レジストリに無い id（json, mock, ui など既存の標準タブ）は、従来どおり
 * id をそのまま Monaco に渡す（Monaco 側が未知なら自動的に plaintext 扱い）。
 */
export function monacoLanguageForTarget(targetId: string): string {
  return OUTPUT_TARGETS[targetId]?.monaco ?? targetId;
}
