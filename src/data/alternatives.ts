export interface ComparisonRow {
  feature: string;
  typemorph: boolean | string;
  competitor: boolean | string;
}

export interface Alternative {
  slug: string;
  competitor: string;
  competitorUrl: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  verdict: {
    useTypemorph: string;
    useCompetitor: string;
  };
  table: ComparisonRow[];
  typemorphStrengths: string[];
  competitorStrengths: string[];
}

export const alternatives: Alternative[] = [
  {
    slug: 'transform-tools',
    competitor: 'transform.tools',
    competitorUrl: 'https://transform.tools',
    title: 'TypeMorph vs transform.tools — Schema Tool Comparison',
    description:
      'Side-by-side comparison of TypeMorph and transform.tools for schema and code conversion. See which tool fits your workflow.',
    h1: 'TypeMorph vs transform.tools',
    intro:
      'Both TypeMorph and transform.tools are free, browser-based conversion tools for developers. They overlap in JSON→TypeScript and JSON→Zod conversions, but target different workflows. Here is an honest comparison.',
    verdict: {
      useTypemorph:
        'You work with JSON, YAML, OpenAPI, or JSON Schema and need schema-focused outputs like Prisma, Drizzle, or Zod with semantic validators — or you want Schema Quality Scoring, Breaking Change Detection, a VS Code Extension, or a CLI.',
      useCompetitor:
        'You need SVG→JSX, HTML→JSX/Pug, or CSS→JS/Tailwind transformations. transform.tools covers frontend asset conversions that TypeMorph does not.',
    },
    table: [
      { feature: 'JSON → TypeScript', typemorph: true, competitor: true },
      { feature: 'JSON → Zod', typemorph: true, competitor: true },
      { feature: 'JSON → Go / Rust', typemorph: true, competitor: true },
      { feature: 'JSON → Java / Kotlin / Python', typemorph: true, competitor: true },
      { feature: 'JSON → Prisma / Drizzle / Kysely', typemorph: true, competitor: false },
      { feature: 'JSON → Mongoose / MySQL / Postgres', typemorph: true, competitor: false },
      { feature: 'OpenAPI / JSON Schema input', typemorph: true, competitor: true },
      { feature: 'Total output formats', typemorph: '160+', competitor: '50+' },
      { feature: 'Schema Quality Score (A–F)', typemorph: true, competitor: false },
      { feature: 'Breaking Change Detector', typemorph: true, competitor: false },
      { feature: 'VS Code Extension', typemorph: true, competitor: false },
      { feature: 'CLI tool (npm)', typemorph: true, competitor: false },
      { feature: 'SVG → JSX', typemorph: false, competitor: true },
      { feature: 'HTML → JSX / Pug', typemorph: false, competitor: true },
      { feature: 'CSS → JS / Tailwind', typemorph: false, competitor: true },
      { feature: 'GraphQL → TypeScript', typemorph: true, competitor: true },
      { feature: 'SVG/HTML/CSS transformations', typemorph: false, competitor: true },
      { feature: 'Free to use', typemorph: true, competitor: true },
      { feature: 'Runs in your browser (no server)', typemorph: true, competitor: true },
    ],
    typemorphStrengths: [
      '160+ schema-focused outputs — TypeScript, Zod, Prisma, Drizzle, Kysely, Go, Rust, Python, Java, Kotlin, Swift, Dart, and more',
      'Zod generator with semantic validators — email → .email(), age → .int().min(0).max(150), latitude → .min(-90).max(90)',
      'Schema Quality Score grades your schema A–F with specific improvement suggestions',
      'Breaking Change Detector — paste two schemas and get a full compatibility report',
      'VS Code Extension — convert schemas without leaving your editor (Ctrl+Shift+T)',
      'CLI tool — typemorph-cli on npm for CI pipeline integration',
    ],
    competitorStrengths: [
      'SVG → JSX and SVG → React Native (with SVGO optimization)',
      'HTML → JSX and HTML → Pug',
      'CSS → JS objects, CSS → TailwindCSS, CSS → template literals',
      'GraphQL → TypeScript, Flow, Java, and more',
      'JSON-LD transformations (compact, expand, flatten, normalize)',
      'TOML ↔ JSON ↔ YAML conversions',
    ],
  },
  {
    slug: 'quicktype',
    competitor: 'quicktype',
    competitorUrl: 'https://quicktype.io',
    title: 'TypeMorph vs quicktype — JSON Schema Conversion Comparison',
    description:
      'Comparing TypeMorph and quicktype for converting JSON to TypeScript, Zod, Go, Rust, and more. Side-by-side feature breakdown.',
    h1: 'TypeMorph vs quicktype',
    intro:
      'quicktype is a well-established JSON-to-types converter supporting many output languages. TypeMorph takes a schema-engineering angle with quality scoring, breaking change detection, and a CLI. Here is an honest breakdown of where each tool excels.',
    verdict: {
      useTypemorph:
        'You want Prisma/Drizzle/ORM output, Schema Quality Scoring, Breaking Change Detection, a VS Code Extension, or CLI integration into CI. TypeMorph is built for schema engineering workflows.',
      useCompetitor:
        'You need Objective-C or Elm output, or you prefer quicktype\'s long-established multi-language coverage.',
    },
    table: [
      { feature: 'JSON → TypeScript', typemorph: true, competitor: true },
      { feature: 'JSON → Zod', typemorph: true, competitor: true },
      { feature: 'Zod with semantic validators (email/age/uuid)', typemorph: true, competitor: false },
      { feature: 'JSON → Go', typemorph: true, competitor: true },
      { feature: 'JSON → Rust', typemorph: true, competitor: true },
      { feature: 'JSON → Python', typemorph: true, competitor: true },
      { feature: 'JSON → Java / Kotlin', typemorph: true, competitor: true },
      { feature: 'JSON → Swift', typemorph: true, competitor: true },
      { feature: 'JSON → C# / C++', typemorph: true, competitor: true },
      { feature: 'JSON → Objective-C', typemorph: false, competitor: true },
      { feature: 'JSON → Elm', typemorph: false, competitor: true },
      { feature: 'JSON → Prisma / Drizzle / Kysely', typemorph: true, competitor: false },
      { feature: 'JSON → Mongoose / SQL schemas', typemorph: true, competitor: false },
      { feature: 'Total output formats', typemorph: '160+', competitor: '~20' },
      { feature: 'Schema Quality Score (A–F)', typemorph: true, competitor: false },
      { feature: 'Breaking Change Detector', typemorph: true, competitor: false },
      { feature: 'VS Code Extension', typemorph: true, competitor: false },
      { feature: 'CLI tool (npm)', typemorph: true, competitor: true },
      { feature: 'OpenAPI input', typemorph: true, competitor: false },
      { feature: 'Runs in your browser (no server)', typemorph: true, competitor: false },
      { feature: 'Free to use', typemorph: true, competitor: true },
    ],
    typemorphStrengths: [
      '160+ output formats including Prisma, Drizzle, Kysely, Mongoose, and SQL schemas that quicktype does not generate',
      'Zod output with semantic validators inferred from field names (email, age, uuid, latitude, etc.)',
      'Schema Quality Score — grades your schema A–F and lists concrete improvement suggestions',
      'Breaking Change Detector — compare two schema versions and get a full compatibility report',
      'VS Code Extension — Ctrl+Shift+T to convert any JSON file without leaving your editor',
      '100% browser-local — no network requests during conversion; your data never leaves your browser tab',
    ],
    competitorStrengths: [
      'Objective-C and Elm output — languages TypeMorph does not cover',
      'Long-established tool with a large user base and community resources',
      'CLI available via npm (quicktype package)',
    ],
  },
  {
    slug: 'json-to-zod',
    competitor: 'json-to-zod',
    competitorUrl: 'https://www.npmjs.com/package/json-to-zod',
    title: 'TypeMorph vs json-to-zod — JSON to Zod Converter Comparison',
    description:
      'A json-to-zod alternative that detects formats. json-to-zod infers only basic types; TypeMorph reads your real JSON and adds .email(), .uuid(), .url(), datetimes, and enums. Honest comparison.',
    h1: 'TypeMorph vs json-to-zod',
    intro:
      'json-to-zod is a popular minimal library for turning a JSON object into a Zod schema. It infers basic types (string, number, boolean, arrays, nested objects) but stops there — emails, UUIDs, URLs, datetimes, and enums all come out as plain z.string(). It is also effectively unmaintained (last published years ago). TypeMorph reads the same JSON and infers the semantic formats and constraints. Here is an honest comparison.',
    verdict: {
      useTypemorph:
        'You want Zod that already detects emails, UUIDs, URLs, datetimes, int-vs-float, and enums from your real JSON — plus TypeScript, Go, Prisma, OpenAPI/JSON Schema input, a schema quality score, breaking-change detection, and a maintained CLI.',
      useCompetitor:
        'You only need a tiny, zero-dependency function to call inside your own code for a rough JSON→Zod scaffold, and you are happy adding .email()/.uuid()/enum refinements by hand afterward.',
    },
    table: [
      { feature: 'JSON → Zod', typemorph: true, competitor: true },
      { feature: 'Nested objects & arrays', typemorph: true, competitor: true },
      { feature: 'Detects email → z.email()', typemorph: true, competitor: false },
      { feature: 'Detects uuid → z.uuid()', typemorph: true, competitor: false },
      { feature: 'Detects url → z.url()', typemorph: true, competitor: false },
      { feature: 'Detects datetime → z.iso.datetime()', typemorph: true, competitor: false },
      { feature: 'Infers enums from repeated values', typemorph: true, competitor: false },
      { feature: 'int vs float & numeric ranges', typemorph: true, competitor: false },
      { feature: 'Shared type extraction (.extend())', typemorph: true, competitor: false },
      { feature: 'Zod v4 output', typemorph: true, competitor: false },
      { feature: 'OpenAPI / JSON Schema input', typemorph: true, competitor: false },
      { feature: 'Other outputs (TypeScript, Go, Prisma…)', typemorph: '160+', competitor: 'Zod only' },
      { feature: 'Schema Quality Score (A–F)', typemorph: true, competitor: false },
      { feature: 'Breaking Change Detector', typemorph: true, competitor: false },
      { feature: 'CLI tool (npm)', typemorph: true, competitor: false },
      { feature: 'Web UI (no install)', typemorph: true, competitor: 'npm library' },
      { feature: 'Actively maintained', typemorph: true, competitor: false },
      { feature: 'Free & open to use', typemorph: true, competitor: true },
    ],
    typemorphStrengths: [
      'Detects semantic formats from real data — email → .email(), uuid → .uuid(), url → .url(), ISO datetimes, and enums from repeated values, where json-to-zod emits plain z.string()',
      'Distinguishes int vs float and infers numeric ranges (e.g. latitude → .min(-90).max(90))',
      'Extracts shared/nested types with .extend() inheritance instead of repeating inline shapes',
      'Outputs 160+ formats beyond Zod — TypeScript, Go, Rust, Prisma, Drizzle, and more from the same JSON',
      'Accepts OpenAPI and JSON Schema as input, not just raw JSON',
      'Maintained, with a Schema Quality Score, Breaking Change Detector, VS Code extension, and a CLI (typemorph-cli) for CI',
    ],
    competitorStrengths: [
      'A tiny, zero-dependency library you can import and call programmatically inside your own JS/TS code',
      'Open source (MIT) with simple, predictable output',
      'Fine for a quick rough scaffold when you intend to refine the schema by hand anyway',
    ],
  },
];
