export interface UseCase {
  slug: string;
  title: string;
  description: string;
  h1: string;
  /** One-sentence direct answer — AI-search extraction target */
  directAnswer: string;
  /** ISO date */
  updated: string;
  /** Estimated time to complete */
  timeEstimate: string;
  problem: string;
  solution: string;
  steps: {
    heading: string;
    body: string;
    code?: { lang: string; content: string };
  }[];
  webAlternative?: {
    heading: string;
    body: string;
  };
  faqs?: { q: string; a: string }[];
  relatedSlugs?: string[];
}

export const useCases: UseCase[] = [
  {
    slug: 'api-response-to-zod',
    title: 'Convert API Response to Zod Schema — Instant, No Config | TypeMorph',
    description:
      'Paste or pipe any JSON API response and get a production-ready Zod v4 schema in seconds. TypeMorph infers uuid, email, url, datetime, int vs float — not just z.string() for everything.',
    h1: 'Convert Any API Response to a Zod Schema',
    directAnswer:
      'Pipe your API response through typemorph-cli zod and get a Zod v4 schema with real type inference — email, uuid, url, datetime, and int vs float are detected automatically from the actual values.',
    updated: '2026-06-25',
    timeEstimate: '30 seconds',
    problem:
      'You call an external API and need runtime validation. Writing the Zod schema by hand is tedious and error-prone — especially for large responses with nested objects, arrays, and date strings. Generic converters output z.string() for every string field, missing email, uuid, url, and datetime constraints.',
    solution:
      'TypeMorph reads the actual values in your JSON, not just the types. One command turns a live API response into a schema that validates uuid, email, url, and datetime fields — ready to drop into your codebase.',
    steps: [
      {
        heading: 'Install (one-time)',
        body: 'No global install needed. npx pulls the latest version automatically.',
        code: {
          lang: 'bash',
          content: 'npm install -g typemorph-cli\n# or use npx without installing',
        },
      },
      {
        heading: 'Pipe the API response directly',
        body: 'Fetch the endpoint and pipe stdout to typemorph-cli. The --root flag sets the exported schema name.',
        code: {
          lang: 'bash',
          content:
            'curl -s https://api.example.com/users/1 \\\n  | npx typemorph-cli zod --root User',
        },
      },
      {
        heading: 'See what TypeMorph infers',
        body: 'Compare this to what other converters produce — every string field gets z.string() elsewhere.',
        code: {
          lang: 'typescript',
          content:
            '// Input JSON\n// { "id": "a1b2c3d4-...", "email": "x@y.com", "created_at": "2024-01-01T00:00:00Z", "age": 25 }\n\n// TypeMorph output\nexport const UserSchema = z.object({\n  id: z.uuid(),\n  email: z.email(),\n  created_at: z.iso.datetime(),\n  age: z.number().int().min(0),\n});\n\n// Other tools\nexport const UserSchema = z.object({\n  id: z.string(),       // ← loses uuid constraint\n  email: z.string(),    // ← loses email constraint\n  created_at: z.string(),\n  age: z.number(),\n});',
        },
      },
      {
        heading: 'Save to a file',
        body: 'Redirect output to your project.',
        code: {
          lang: 'bash',
          content:
            'curl -s https://api.example.com/users/1 \\\n  | npx typemorph-cli zod --root User > src/schemas/user.ts',
        },
      },
    ],
    webAlternative: {
      heading: 'No terminal? Use the web workbench',
      body: 'Paste JSON at typemorph.dev, pick "Zod" from the format dropdown, and copy the schema. Works 100% in your browser — no signup, no data upload.',
    },
    faqs: [
      {
        q: 'What Zod version does TypeMorph output?',
        a: 'Zod v4 by default (using z.email(), z.uuid(), z.iso.datetime()). Select "Zod v3" in the format picker or pass --format zod-v3 in the CLI for the legacy import from "zod".',
      },
      {
        q: 'Does it handle nested objects and arrays?',
        a: 'Yes. Nested objects become z.object({...}), arrays become z.array(...), and type inference runs recursively through every level.',
      },
      {
        q: 'What if the API returns different shapes on different calls?',
        a: 'TypeMorph infers from the single sample you provide. For polymorphic responses, run the command on a few representative samples and merge the outputs manually.',
      },
      {
        q: 'Can I generate TypeScript interfaces instead of Zod?',
        a: 'Yes — replace zod with typescript: npx typemorph-cli typescript schema.json. Over 160 output formats are supported.',
      },
    ],
    relatedSlugs: ['api-drift-detection', 'github-actions-schema-check'],
  },
  {
    slug: 'api-drift-detection',
    title: 'Detect API Schema Drift Without OpenAPI Spec | TypeMorph',
    description:
      'Monitor a third-party or internal API for breaking schema changes using only live JSON responses. No OpenAPI spec, no YAML config — typemorph check saves a baseline and alerts on field removal or type changes.',
    h1: 'Detect API Schema Drift Without an OpenAPI Spec',
    directAnswer:
      'typemorph check saves a schema baseline from a live API response and exits 1 when it detects breaking changes — removed fields, type changes — on the next run. No OpenAPI spec required.',
    updated: '2026-06-25',
    timeEstimate: '5 minutes',
    problem:
      'Third-party APIs change without notice. Your code breaks in production because a field was renamed or a type changed. Tools like oasdiff require two OpenAPI spec files that you may not have, especially for external APIs.',
    solution:
      'typemorph check infers a schema from a real API response, saves it as a baseline JSON, then compares future responses against it. Breaking changes (field removed, type changed) exit 1 so your CI pipeline catches them before they reach production.',
    steps: [
      {
        heading: 'Save your first baseline',
        body: 'On first run with no existing baseline file, typemorph check creates one and exits 0.',
        code: {
          lang: 'bash',
          content:
            'mkdir -p .typemorph\ncurl -s https://api.example.com/users/1 \\\n  | npx typemorph-cli check --baseline .typemorph/users.json',
        },
      },
      {
        heading: 'Run again to detect drift',
        body: 'Subsequent runs compare against the saved baseline. Breaking changes exit 1 with a summary.',
        code: {
          lang: 'bash',
          content:
            'curl -s https://api.example.com/users/1 \\\n  | npx typemorph-cli check --baseline .typemorph/users.json\n\n# Output on breaking change:\n# ✖  2 breaking changes detected\n#   email  string → undefined  (field removed)',
        },
      },
      {
        heading: 'Update the baseline when changes are intentional',
        body: 'After confirming a change is expected, update the baseline so future runs are clean.',
        code: {
          lang: 'bash',
          content:
            'curl -s https://api.example.com/users/1 \\\n  | npx typemorph-cli check --baseline .typemorph/users.json --update',
        },
      },
      {
        heading: 'Commit the baseline to git',
        body: 'The baseline file is plain JSON. Committing it lets the whole team and CI pipeline use the same reference.',
        code: {
          lang: 'bash',
          content: 'git add .typemorph/\ngit commit -m "chore: add API schema baselines"',
        },
      },
    ],
    webAlternative: {
      heading: 'Try it in the browser first',
      body: 'The API Drift Check tool at typemorph.dev/tools/api-drift-check lets you paste a baseline and a current response to see the diff interactively — before adding it to CI.',
    },
    faqs: [
      {
        q: 'How is this different from oasdiff?',
        a: 'oasdiff compares two OpenAPI spec files — you need a spec for both the old and new API. typemorph check works directly from live JSON responses with no spec file at all.',
      },
      {
        q: 'Does it produce false positives on enum fields?',
        a: 'Enum changes are downgraded to warnings (not errors) because a single-sample baseline can\'t prove the inferred enum is complete. Field removals and type changes remain errors.',
      },
      {
        q: 'Can I monitor multiple endpoints?',
        a: 'Yes — use a different --baseline path for each endpoint and run the check command once per endpoint in your CI step.',
      },
      {
        q: 'Does it work for internal APIs behind auth?',
        a: 'Yes. Pass --header "Authorization: Bearer $TOKEN" to include request headers when fetching from a URL, or pipe from curl with your auth headers.',
      },
    ],
    relatedSlugs: ['github-actions-schema-check', 'staging-vs-production-diff'],
  },
  {
    slug: 'github-actions-schema-check',
    title: 'API Schema Check in GitHub Actions CI | TypeMorph',
    description:
      'Add breaking-change detection for your JSON APIs to any GitHub Actions workflow in under 5 minutes. No OpenAPI spec required — typemorph-cli check reads live responses and fails the build on schema drift.',
    h1: 'Add API Schema Drift Detection to GitHub Actions',
    directAnswer:
      'Add a curl | npx typemorph-cli check step to your GitHub Actions workflow. It exits 1 on breaking changes and writes a summary to $GITHUB_STEP_SUMMARY — no OpenAPI spec, no extra services.',
    updated: '2026-06-25',
    timeEstimate: '5 minutes',
    problem:
      'Schema drift from third-party APIs silently breaks production. Existing API monitoring tools require OpenAPI specs, paid plans, or complex config. You want something that works in CI with just npm and curl.',
    solution:
      'typemorph-cli check is a zero-config Node.js script. Add it to any GitHub Actions workflow: baseline is committed to git, the check step compares the live response against it, and the workflow fails if anything breaks.',
    steps: [
      {
        heading: 'Create the workflow file',
        body: 'Add this to .github/workflows/api-schema.yml. The baseline file is read from the repo.',
        code: {
          lang: 'yaml',
          content: `name: API Schema Check
on:
  schedule:
    - cron: '0 9 * * 1-5'   # weekdays at 09:00 UTC
  push:
    paths:
      - '.typemorph/**'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check /users schema
        run: |
          curl -s https://api.example.com/users/1 | \\
          npx typemorph-cli check \\
            --baseline .typemorph/users.json \\
            --format github >> $GITHUB_STEP_SUMMARY`,
        },
      },
      {
        heading: 'Commit your baseline',
        body: 'Run the check once locally to generate the baseline, then commit it.',
        code: {
          lang: 'bash',
          content:
            'mkdir -p .typemorph\ncurl -s https://api.example.com/users/1 \\\n  | npx typemorph-cli check --baseline .typemorph/users.json\ngit add .typemorph/users.json\ngit commit -m "chore: add users API schema baseline"',
        },
      },
      {
        heading: 'Check the Actions summary on failure',
        body: 'With --format github, breaking changes are written as a Markdown table to the Actions step summary — visible directly in the GitHub UI without reading raw logs.',
        code: {
          lang: 'bash',
          content:
            '# Example step summary output:\n# | Field  | Change           | Severity |\n# |--------|-----------------|----------|\n# | email  | string → missing | error    |',
        },
      },
      {
        heading: 'Monitor multiple endpoints',
        body: 'Add one step per endpoint. Use a matrix strategy for many endpoints.',
        code: {
          lang: 'yaml',
          content: `      - name: Check /orders schema
        run: |
          curl -s https://api.example.com/orders/1 | \\
          npx typemorph-cli check \\
            --baseline .typemorph/orders.json \\
            --format github >> $GITHUB_STEP_SUMMARY`,
        },
      },
    ],
    faqs: [
      {
        q: 'Do I need an OpenAPI spec file?',
        a: 'No. typemorph check infers the schema from the actual JSON response each time. No spec file, no YAML config.',
      },
      {
        q: 'How do I pass API authentication headers in CI?',
        a: 'Store your token as a GitHub Actions secret, then: curl -s -H "Authorization: Bearer ${{ secrets.API_TOKEN }}" https://api.example.com/endpoint | npx typemorph-cli check --baseline .typemorph/endpoint.json',
      },
      {
        q: 'Will it break my build on the first run?',
        a: 'No. If the baseline file does not exist yet, typemorph check creates it and exits 0. Only subsequent runs that find a diff will exit 1.',
      },
      {
        q: 'Can I use it with GitLab CI or Bitbucket Pipelines?',
        a: 'Yes. The command is plain Node.js/npm — it works in any CI environment. The --format github flag adds GitHub-specific summary output; omit it on other CI systems.',
      },
    ],
    relatedSlugs: ['api-drift-detection', 'staging-vs-production-diff'],
  },
  {
    slug: 'staging-vs-production-diff',
    title: 'Compare Staging vs Production API Schemas | TypeMorph envdiff',
    description:
      'Catch breaking changes between your staging and production APIs before deployment. typemorph envdiff fetches both endpoints and shows field-level diffs with severity — no OpenAPI spec needed.',
    h1: 'Compare Staging vs Production API Schemas',
    directAnswer:
      'npx typemorph-cli envdiff --a https://staging.api.com/users/1 --b https://prod.api.com/users/1 fetches both endpoints, infers their schemas, and shows field-level breaking changes. No spec files.',
    updated: '2026-06-25',
    timeEstimate: '1 minute',
    problem:
      'Deploying to production when staging has a different API shape can silently break clients. Manually comparing JSON responses is slow and misses nested changes. OpenAPI diffing tools require you to maintain spec files for both environments.',
    solution:
      'typemorph envdiff fetches two live URLs (or reads two local files), infers both schemas, and produces a semantic diff — highlighting removed fields, type changes, and new fields with error/warning/info severity.',
    steps: [
      {
        heading: 'Run envdiff on two live environments',
        body: 'Pass both endpoint URLs. typemorph fetches them in parallel, infers schemas, and diffs.',
        code: {
          lang: 'bash',
          content:
            'npx typemorph-cli envdiff \\\n  --a https://staging.api.example.com/users/1 \\\n  --b https://prod.api.example.com/users/1',
        },
      },
      {
        heading: 'Or compare two local response files',
        body: 'Pass file paths instead of URLs to diff saved responses.',
        code: {
          lang: 'bash',
          content:
            'npx typemorph-cli envdiff \\\n  --a responses/staging-user.json \\\n  --b responses/prod-user.json',
        },
      },
      {
        heading: 'Filter to breaking changes only',
        body: 'Use --breaking-only to suppress new-field additions and show only errors.',
        code: {
          lang: 'bash',
          content:
            'npx typemorph-cli envdiff \\\n  --a https://staging.api.example.com/users/1 \\\n  --b https://prod.api.example.com/users/1 \\\n  --breaking-only',
        },
      },
      {
        heading: 'Add to your deployment gate',
        body: 'envdiff exits 1 if breaking changes are found. Chain it before your deploy step.',
        code: {
          lang: 'bash',
          content:
            '# In your deploy script or CI\nnpx typemorph-cli envdiff \\\n  --a $STAGING_API/users/1 \\\n  --b $PROD_API/users/1 \\\n  --breaking-only \\\n&& echo "Safe to deploy" \\\n|| (echo "Schema mismatch — aborting deploy" && exit 1)',
        },
      },
    ],
    webAlternative: {
      heading: 'No CLI? Use the web tool',
      body: 'Paste both JSON responses at typemorph.dev/tools/env-diff to see the diff interactively in your browser.',
    },
    faqs: [
      {
        q: 'What counts as a breaking change?',
        a: 'Field removed, field type changed to an incompatible type, or required field becoming missing. New fields are flagged as info (not breaking). Enum additions are warnings.',
      },
      {
        q: 'Can I pass auth headers for protected endpoints?',
        a: 'Yes: --header "Authorization: Bearer $TOKEN". The flag can be repeated for multiple headers.',
      },
      {
        q: 'Does it work for deeply nested responses?',
        a: 'Yes. Schema inference is recursive — differences at any nesting level are reported with their full field path.',
      },
      {
        q: 'What if staging and production intentionally have different schemas?',
        a: 'Run with --breaking-only to ignore additions. If you expect certain fields to differ permanently, use separate baselines with the check command instead.',
      },
    ],
    relatedSlugs: ['api-drift-detection', 'github-actions-schema-check'],
  },
  {
    slug: 'generate-mcp-tool-definition',
    title: 'Generate MCP Tool Definition from JSON | TypeMorph',
    description:
      'Convert any JSON schema or API response to an MCP (Model Context Protocol) tool definition in one command. TypeMorph outputs the inputSchema, name, and description fields ready for your MCP server.',
    h1: 'Generate MCP Tool Definitions from JSON',
    directAnswer:
      'npx typemorph-cli mcp-tool schema.json --root SearchProducts outputs a complete MCP tool definition with inputSchema as a JSON Schema object — ready to register in your MCP server.',
    updated: '2026-06-25',
    timeEstimate: '1 minute',
    problem:
      'Writing MCP tool definitions by hand is repetitive. The inputSchema field must be a valid JSON Schema, and getting the types right for nested objects, arrays, and string formats takes time.',
    solution:
      'TypeMorph infers the JSON Schema from your data (or existing schema file) and wraps it in an MCP-compatible tool definition. You get a ready-to-use object you can paste directly into your MCP server\'s tool registry.',
    steps: [
      {
        heading: 'Generate from a JSON sample',
        body: 'Point typemorph-cli at any JSON file. The --root flag becomes the tool name (camelCase).',
        code: {
          lang: 'bash',
          content:
            'echo \'{"query": "shoes", "limit": 10, "category": "footwear"}\' \\\n  | npx typemorph-cli mcp-tool --root SearchProducts',
        },
      },
      {
        heading: 'See the output',
        body: 'The result is a JSON object you can spread into your tools array.',
        code: {
          lang: 'json',
          content:
            '{\n  "name": "SearchProducts",\n  "description": "SearchProducts tool",\n  "inputSchema": {\n    "type": "object",\n    "properties": {\n      "query":    { "type": "string" },\n      "limit":   { "type": "integer", "minimum": 0 },\n      "category": { "type": "string" }\n    },\n    "required": ["query", "limit", "category"]\n  }\n}',
        },
      },
      {
        heading: 'Register in your MCP server',
        body: 'Paste the output into your server\'s tool definitions.',
        code: {
          lang: 'typescript',
          content:
            '// server.ts\nconst tools = [\n  // paste typemorph output here\n  {\n    name: "SearchProducts",\n    description: "Search product catalog",\n    inputSchema: { /* ... */ },\n  },\n];',
        },
      },
      {
        heading: 'Also works for OpenAI function calling and Vercel AI SDK',
        body: 'Same JSON, different output format.',
        code: {
          lang: 'bash',
          content:
            '# OpenAI function calling\necho \'{"query":"shoes",...}\' | npx typemorph-cli openai-function --root SearchProducts\n\n# Vercel AI SDK tool\necho \'{"query":"shoes",...}\' | npx typemorph-cli vercel-ai-tool --root SearchProducts',
        },
      },
    ],
    faqs: [
      {
        q: 'What version of the MCP spec does this target?',
        a: 'The output follows the MCP tool definition format with inputSchema as a JSON Schema Draft 7 object, compatible with the current MCP TypeScript SDK.',
      },
      {
        q: 'Can I use an existing Zod schema as input?',
        a: 'Not directly yet. The recommended workflow is: generate a JSON sample from your Zod schema using typemorph reverse, then pipe that through typemorph mcp-tool.',
      },
      {
        q: 'Does TypeMorph infer string formats in the inputSchema?',
        a: 'Yes. Fields detected as email, uuid, or uri get a format annotation in the JSON Schema output.',
      },
      {
        q: 'Can I generate tool definitions for all my endpoints at once?',
        a: 'Yes — loop over your JSON samples in a shell script and redirect each output to a separate file, then import them all into your MCP server.',
      },
    ],
    relatedSlugs: ['api-response-to-zod'],
  },
];
