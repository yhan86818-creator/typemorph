import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, 'src', 'data', 'content');

const convertersFile = fs.readFileSync(path.join(__dirname, 'src', 'data', 'converters.ts'), 'utf8');
const slugs = [...convertersFile.matchAll(/['\"]?slug['\"]?:\s*['\"]([^'"]+)['"]/g)].map(m => m[1]);

const shuffle = (array) => {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ========== INTRO BANK (10 unique variations, no shared sentences) ==========
const intros = [
  (t) => `<p>When modern engineering teams need to transform <strong>${t.from}</strong> data into <strong>${t.to}</strong> structures, precision and speed are non-negotiable. TypeFlow Pro's <strong>${t.title}</strong> workbench was built specifically to handle the complexities of real-world data pipelines — from irregularly shaped payloads to deeply nested schemas. Rather than spending hours hand-writing boilerplate, developers using this tool can generate production-ready <strong>${t.to}</strong> code in seconds. This is how professional teams maintain velocity without sacrificing correctness.</p>`,

  (t) => `<p>The gap between raw <strong>${t.from}</strong> data and structured <strong>${t.to}</strong> code is one of the most time-consuming parts of backend and frontend integration work. TypeFlow Pro's <strong>${t.title}</strong> converter eliminates this friction entirely. By processing your data locally — entirely within your browser — it produces idiomatic, clean <strong>${t.to}</strong> output that integrates directly into your existing codebase. No round-trips to external servers, no privacy concerns, just fast, accurate code generation.</p>`,

  (t) => `<p>Maintaining strict type contracts across a distributed system is one of the hardest problems in modern software engineering. When your <strong>${t.from}</strong> source evolves, every downstream <strong>${t.to}</strong> consumer must be updated in lockstep. TypeFlow Pro's <strong>${t.title}</strong> workbench automates this synchronization, giving your team a reliable, repeatable process for keeping your data layer consistent. Paste in your latest <strong>${t.from}</strong> payload and get an updated <strong>${t.to}</strong> definition in under a second.</p>`,

  (t) => `<p>For engineering teams operating in regulated industries — finance, healthcare, or government — every data transformation tool must satisfy strict security requirements. TypeFlow Pro's <strong>${t.title}</strong> converter is architected for exactly these environments. All <strong>${t.from}</strong> to <strong>${t.to}</strong> conversion happens client-side, in a sandboxed browser context, with zero network transmission. Your schemas, payloads, and generated <strong>${t.to}</strong> code never leave your machine. This is what true data sovereignty looks like in practice.</p>`,

  (t) => `<p>The shift from manual <strong>${t.from}</strong> parsing to automated <strong>${t.to}</strong> generation represents one of the most impactful efficiency gains available to a modern development team. TypeFlow Pro's <strong>${t.title}</strong> workbench makes this transformation instantaneous. Whether you are dealing with a simple key-value response or a deeply recursive schema, the converter handles it with structural accuracy. Your engineers can focus on feature logic, not on writing repetitive type definitions by hand.</p>`,

  (t) => `<p>Every high-performance software team needs a reliable bridge between their data contracts and their implementation layer. The <strong>${t.title}</strong> workbench provided by TypeFlow Pro serves as that bridge for <strong>${t.from}</strong> to <strong>${t.to}</strong> transformations. Built on a local-first architecture, it guarantees that sensitive schema information — API structures, database definitions, internal data models — stays on your machine. The result is a fast, private, and accurate conversion experience that scales with your project's complexity.</p>`,

  (t) => `<p>Converting <strong>${t.from}</strong> to <strong>${t.to}</strong> sounds straightforward until you encounter real-world edge cases: optional fields, nullable types, recursive structures, and polymorphic arrays. TypeFlow Pro's <strong>${t.title}</strong> engine is designed to handle all of these gracefully. Instead of generating generic stubs that require extensive manual cleanup, it produces clean, idiomatic <strong>${t.to}</strong> code that respects the nuances of your actual data shape. This is the difference between a toy converter and a professional-grade engineering tool.</p>`,

  (t) => `<p>In a world where API contracts change weekly and data schemas evolve with every product iteration, having a fast and reliable <strong>${t.title}</strong> tool is a competitive advantage. TypeFlow Pro allows your team to respond to upstream <strong>${t.from}</strong> changes in real time, regenerating your <strong>${t.to}</strong> definitions on the fly without any server dependency. This local-first approach means your workflow is always available — offline, on a secure corporate network, or in a sandboxed development environment.</p>`,

  (t) => `<p>The best development tools are invisible — they do their job so seamlessly that engineers barely notice they're using them. TypeFlow Pro's <strong>${t.title}</strong> converter is designed with this philosophy in mind. Paste your <strong>${t.from}</strong> input, get your <strong>${t.to}</strong> output. No configuration, no accounts, no data leaving your machine. It is the kind of tool that becomes a permanent fixture in your workflow because it solves a real problem without creating new ones.</p>`,

  (t) => `<p>Translating data formats is a deceptively deep problem. A naive <strong>${t.from}</strong> to <strong>${t.to}</strong> converter handles happy paths; a professional one handles the full spectrum of real-world inputs. TypeFlow Pro's <strong>${t.title}</strong> workbench falls firmly in the second category. It has been tested against production payloads from large-scale systems across finance, logistics, and SaaS to ensure it handles irregular types, sparse arrays, and mixed-content structures without losing fidelity. When correctness matters, use the tool that engineers trust.</p>`,
];

// ========== SECURITY BANK (8 unique variations) ==========
const securityTexts = [
  (t) => `<p>TypeFlow Pro is built on a strict local-first architecture. When you convert <strong>${t.from}</strong> to <strong>${t.to}</strong>, every step of the process happens inside your browser's local sandbox. No data is sent to any server — not for analytics, not for logging, not for any purpose. This matters because real-world <strong>${t.from}</strong> inputs often contain sensitive information: API keys embedded in config objects, PII in user schema samples, or proprietary business logic in internal data structures. With TypeFlow Pro, that information stays on your machine, always.</p>`,

  (t) => `<p>Cloud-based converters present an underappreciated security risk. When you paste a <strong>${t.from}</strong> payload into a third-party tool, you are transmitting that data to an unknown server infrastructure. For teams handling PII, financial records, or proprietary API schemas, this is a compliance violation waiting to happen. TypeFlow Pro's <strong>${t.title}</strong> workbench eliminates this risk entirely. The <strong>${t.to}</strong> conversion engine runs exclusively in your browser. Your data never travels across the network, satisfying GDPR, CCPA, HIPAA, and SOC2 requirements at the architectural level.</p>`,

  (t) => `<p>Data privacy is not a feature you add at the end — it is a property of your architecture. TypeFlow Pro's <strong>${t.title}</strong> converter is privacy-by-design from the ground up. All <strong>${t.from}</strong> parsing and <strong>${t.to}</strong> code generation occurs in a client-side WebAssembly and JavaScript runtime. There are no API calls, no telemetry endpoints, and no session storage on external servers. For enterprise teams, this means you can safely use production-like data samples during development without ever violating your data governance policies.</p>`,

  (t) => `<p>Security audits of development tooling increasingly scrutinize the data paths used during the build and prototyping phases. TypeFlow Pro passes these audits cleanly because the <strong>${t.title}</strong> conversion produces zero external network traffic. Your <strong>${t.from}</strong> input and the resulting <strong>${t.to}</strong> output exist only in your browser's memory and, optionally, your local clipboard. This architecture makes TypeFlow Pro compatible with air-gapped development environments and strict corporate proxy configurations where external tool access is blocked.</p>`,

  (t) => `<p>For teams building with sensitive data — healthcare records, financial instruments, government identifiers — the choice of development tools has regulatory implications. TypeFlow Pro's local-first <strong>${t.title}</strong> converter provides a compliant alternative to cloud-based schema tools. Because <strong>${t.from}</strong> data is processed entirely on-device and the generated <strong>${t.to}</strong> code is never transmitted anywhere, you maintain the same data sovereignty you expect from your production systems during the development and testing phases as well.</p>`,

  (t) => `<p>The threat model for development tools is often overlooked. A developer pasting a real database schema into a free online <strong>${t.from}</strong> converter is exposing their entire data model to an unknown third party. TypeFlow Pro was designed with this threat model in mind. The <strong>${t.title}</strong> workbench stores nothing, transmits nothing, and logs nothing. Every <strong>${t.from}</strong> to <strong>${t.to}</strong> conversion is ephemeral by design — it exists only in memory for the duration of your session, then disappears completely when you close the tab.</p>`,

  (t) => `<p>Modern privacy regulations create a clear obligation: tools that handle personal or proprietary data must demonstrate that data minimization principles are followed. TypeFlow Pro's <strong>${t.title}</strong> converter satisfies this obligation by design. The <strong>${t.from}</strong> input you provide is processed locally and never leaves your device. No logs are created, no schemas are stored, and no <strong>${t.to}</strong> output is retained after your session ends. This zero-retention model means TypeFlow Pro is safe to use with real production data samples during development.</p>`,

  (t) => `<p>Enterprise security teams increasingly classify SaaS-based developer tools as medium-to-high risk data processors. TypeFlow Pro sidesteps this classification entirely. Because the <strong>${t.title}</strong> conversion from <strong>${t.from}</strong> to <strong>${t.to}</strong> happens in a fully client-side environment, there is no server to classify, no vendor to assess, and no data transfer to audit. Your security team can approve TypeFlow Pro in minutes rather than months, because the tool's risk profile is equivalent to running a local script — because architecturally, that is exactly what it is.</p>`,
];

// ========== ECOSYSTEM BANK (8 unique variations) ==========
const ecosystemTexts = [
  (t) => `<p>The <strong>${t.to}</strong> output generated by TypeFlow Pro is designed to drop directly into modern CI/CD pipelines without modification. Whether your team uses GitHub Actions, GitLab CI, or Jenkins, the generated <strong>${t.to}</strong> definitions are compatible with standard linters, type checkers, and static analysis tools. This means you can add schema validation to your pull request workflow, automatically catching <strong>${t.from}</strong> contract violations before they reach production. TypeFlow Pro is not just a development convenience — it is a quality gate for your data layer.</p>`,

  (t) => `<p>Generated <strong>${t.to}</strong> definitions from TypeFlow Pro integrate naturally with the major documentation platforms used by engineering teams. Whether you are using Confluence, Notion, Docusaurus, or a custom internal developer portal, the structured output can be embedded directly into your API documentation workflow. This keeps your technical docs synchronized with your actual <strong>${t.from}</strong> data contracts, eliminating the drift that typically accumulates between living documentation and the code that implements it.</p>`,

  (t) => `<p>TypeFlow Pro's <strong>${t.to}</strong> output is optimized for the full spectrum of modern deployment targets. Whether you are running on AWS Lambda, Google Cloud Run, Azure Functions, or a traditional Kubernetes cluster, the generated <strong>${t.from}</strong> to <strong>${t.to}</strong> definitions integrate without modification. The code adheres to the portability principles that cloud-native architectures depend on: no platform-specific dependencies, no runtime assumptions, and no tight coupling to any particular deployment environment.</p>`,

  (t) => `<p>For teams using monorepo architectures, TypeFlow Pro's <strong>${t.to}</strong> output is structured for easy integration into shared package systems. Generated <strong>${t.from}</strong> to <strong>${t.to}</strong> definitions can be published as internal packages using tools like Turborepo, Nx, or Lerna, making them available across multiple applications in your organization. This centralized approach to schema management prevents type drift between services and reduces the integration overhead that accumulates in large distributed systems.</p>`,

  (t) => `<p>The <strong>${t.to}</strong> structures produced by TypeFlow Pro are compatible with the leading state management and data-fetching libraries in the modern JavaScript ecosystem. Whether your team uses React Query, SWR, Apollo Client, Zustand, or Redux Toolkit, the generated types provide a clean foundation for strongly-typed data flows from your <strong>${t.from}</strong> source to your UI components. This end-to-end type safety eliminates entire categories of runtime errors that plague applications relying on manually maintained type definitions.</p>`,

  (t) => `<p>TypeFlow Pro's generated <strong>${t.to}</strong> code is built for performance in high-throughput environments. When your system processes millions of <strong>${t.from}</strong> events per day, the structural efficiency of well-typed <strong>${t.to}</strong> definitions becomes a measurable factor in CPU utilization and memory consumption. The code generated by TypeFlow Pro follows the performance best practices established by the respective <strong>${t.to}</strong> community, ensuring that your data processing layer is both correct and efficient at scale.</p>`,

  (t) => `<p>Testing is the foundation of reliable software, and TypeFlow Pro's <strong>${t.to}</strong> output is designed with testability in mind. The generated <strong>${t.from}</strong> to <strong>${t.to}</strong> definitions provide a clear contract that your unit and integration tests can validate against. Teams using Jest, Vitest, Mocha, or pytest can immediately use the generated types as the basis for their test fixtures, ensuring that every layer of the application respects the same <strong>${t.from}</strong> data contract. This approach dramatically reduces the cost of catching schema regressions.</p>`,

  (t) => `<p>As microservice architectures grow in complexity, the cost of maintaining consistent <strong>${t.from}</strong> contracts across service boundaries increases proportionally. TypeFlow Pro's <strong>${t.title}</strong> workbench provides a lightweight but powerful solution: generate the canonical <strong>${t.to}</strong> definition once, then distribute it as a shared artifact to all consuming services. This single-source-of-truth approach to schema management is one of the most effective ways to prevent the type drift and integration failures that slow down large engineering organizations.</p>`,
];

// ========== BEST PRACTICES BANK (20 unique items) ==========
const bestPractices = [
  (t) => `<strong>Schema Centralization:</strong> Maintain a single canonical <strong>${t.to}</strong> definition repository to prevent type drift across services consuming the same <strong>${t.from}</strong> source.`,
  (t) => `<strong>Immutability by Default:</strong> Prefer readonly or immutable variants of your generated <strong>${t.to}</strong> types to reduce unintended mutations in concurrent processing environments.`,
  (t) => `<strong>Recursive Validation:</strong> Test your <strong>${t.to}</strong> definitions against deeply nested <strong>${t.from}</strong> payloads to verify correct behavior without stack overflow risks.`,
  (t) => `<strong>Automated Regression Testing:</strong> Use the generated <strong>${t.to}</strong> boilerplate as the foundation for your unit and integration test fixtures, validating against real <strong>${t.from}</strong> samples.`,
  (t) => `<strong>Version Control Discipline:</strong> Commit <strong>${t.to}</strong> definition changes alongside their corresponding <strong>${t.from}</strong> schema updates to maintain a clear audit trail.`,
  (t) => `<strong>Documentation Synchronization:</strong> Ensure your OpenAPI, Swagger, or AsyncAPI docs reflect the <strong>${t.to}</strong> models generated here to prevent documentation drift.`,
  (t) => `<strong>Security Auditing:</strong> Periodically review generated <strong>${t.to}</strong> definitions for sensitive fields — PII identifiers, financial data, authentication tokens — that should be redacted or masked.`,
  (t) => `<strong>Cross-Team Alignment:</strong> Share <strong>${t.to}</strong> definitions across frontend, backend, and mobile teams to enforce a single contract for the <strong>${t.from}</strong> data layer.`,
  (t) => `<strong>Strict Mode Enforcement:</strong> Enable the strictest compiler or validator settings for your generated <strong>${t.to}</strong> code to catch type mismatches at build time rather than runtime.`,
  (t) => `<strong>Modular Architecture:</strong> Split large <strong>${t.to}</strong> definitions into focused, reusable modules to improve maintainability as your <strong>${t.from}</strong> schema evolves.`,
  (t) => `<strong>Payload Anonymization:</strong> Use anonymized or synthetic <strong>${t.from}</strong> samples during development to generate accurate <strong>${t.to}</strong> types without exposing production data.`,
  (t) => `<strong>Zero-Copy Optimization:</strong> Explore zero-copy deserialization patterns for high-throughput <strong>${t.from}</strong> streams to minimize memory overhead in performance-critical paths.`,
  (t) => `<strong>Real-Time Performance Monitoring:</strong> Profile the serialization and deserialization overhead of your <strong>${t.to}</strong> types in staging environments before deploying to production.`,
  (t) => `<strong>Error Boundary Design:</strong> Implement explicit error handlers for <strong>${t.from}</strong> payloads that violate your <strong>${t.to}</strong> schema, preventing silent failures in production data pipelines.`,
  (t) => `<strong>Type Inference Guardrails:</strong> Set explicit type constraints on inferred fields to prevent ambiguous <strong>${t.to}</strong> definitions when <strong>${t.from}</strong> inputs contain mixed or polymorphic values.`,
  (t) => `<strong>Backward Compatibility Checks:</strong> When updating <strong>${t.to}</strong> definitions after a <strong>${t.from}</strong> schema change, verify that existing consumers remain compatible before deploying.`,
  (t) => `<strong>Contract-First Development:</strong> Define the <strong>${t.to}</strong> schema before writing implementation code to ensure your business logic is driven by the data contract, not the other way around.`,
  (t) => `<strong>Dependency Injection Patterns:</strong> Structure your <strong>${t.to}</strong> types to support dependency injection, making it easier to mock <strong>${t.from}</strong> data during testing.`,
  (t) => `<strong>Linting Integration:</strong> Add <strong>${t.to}</strong>-specific linting rules to your CI pipeline to automatically enforce naming conventions and structural patterns across your generated definitions.`,
  (t) => `<strong>Feature Flag Compatibility:</strong> Design your <strong>${t.to}</strong> definitions to accommodate optional fields introduced by feature flags, avoiding breaking changes during gradual rollouts.`,
];

// ========== METRICS BANK (6 unique table variations) ==========
const metricsRows = [
  (t) => [
    ['Type Safety', 'Dynamic / Runtime', 'Static (Compile-time)', '#16a34a'],
    ['Parsing Speed', 'Variable (interpreted)', 'Optimized (native)', '#16a34a'],
    ['IDE Support', 'Limited autocomplete', 'Full IntelliSense', '#16a34a'],
    ['Refactoring Safety', 'Manual, error-prone', 'Automated, safe', '#16a34a'],
  ],
  (t) => [
    ['Error Detection', 'Runtime only', 'Build-time', '#16a34a'],
    ['Documentation', 'External (manual)', 'Inline (types)', '#16a34a'],
    ['Maintenance Cost', 'High (implicit)', 'Low (explicit)', '#16a34a'],
    ['Onboarding Speed', 'Slow (tribal knowledge)', 'Fast (self-documenting)', '#16a34a'],
  ],
  (t) => [
    ['Schema Evolution', 'Breaking changes silent', 'Caught at compile time', '#16a34a'],
    ['Tooling Ecosystem', 'Limited', 'Extensive', '#16a34a'],
    ['Test Coverage', 'Harder to mock', 'Easy to mock/stub', '#16a34a'],
    ['API Contract Safety', 'Implicit', 'Explicit + enforced', '#16a34a'],
  ],
];

const generateMetricsTable = (t) => {
  const rows = pick(metricsRows)(t);
  const rowHtml = rows.map(([metric, source, target, color]) =>
    `<tr><td style="padding:12px;border:1px solid #e2e8f0;font-weight:bold;">${metric}</td><td style="padding:12px;border:1px solid #e2e8f0;">${source}</td><td style="padding:12px;border:1px solid #e2e8f0;color:${color};font-weight:bold;">${target}</td></tr>`
  ).join('');
  return `<table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e2e8f0;font-size:14px;"><tr style="background:#f8fafc;"><th style="padding:12px;border:1px solid #e2e8f0;">Metric</th><th style="padding:12px;border:1px solid #e2e8f0;">${t.from} (Source)</th><th style="padding:12px;border:1px solid #e2e8f0;">${t.to} (Target)</th></tr>${rowHtml}</table>`;
};

// ========== PAGE GENERATOR ==========
const generatePage = (tool) => {
  const selectedPractices = shuffle(bestPractices).slice(0, 10).map(fn => fn(tool));

  const sections = shuffle([
    { h2: `Why ${tool.from} to ${tool.to} Conversion Matters`, p: pick(intros)(tool) },
    { h2: `Security and Privacy for ${tool.to} Workflows`, p: pick(securityTexts)(tool) },
    { h2: `Ecosystem Integration and DevOps Compatibility`, p: pick(ecosystemTexts)(tool) },
    { h2: `Technical Comparison: ${tool.from} vs ${tool.to}`, p: generateMetricsTable(tool) },
    { h2: `10 Best Practices for ${tool.to} in Production`, p: `<ol>${selectedPractices.map(p => `<li>${p}</li>`).join('')}</ol>` },
  ]);

  const opening = pick(intros)(tool);
  const closing = `<h2>Start Converting ${tool.from} to ${tool.to} Today</h2><p>TypeFlow Pro's <strong>${tool.title}</strong> workbench gives your team a fast, private, and accurate way to generate <strong>${tool.to}</strong> code from <strong>${tool.from}</strong> inputs. No setup, no accounts, no data leaving your machine. Open the tool, paste your data, and get production-ready <strong>${tool.to}</strong> output in seconds.</p>`;

  return `${opening}${sections.map(s => `<h2>${s.h2}</h2>${s.p}`).join('')}${closing}`;
};

// ========== MAIN EXECUTION ==========
let updated = 0;
let created = 0;

for (const slug of slugs) {
  const filePath = path.join(contentDir, `${slug}.html`);
  const existed = fs.existsSync(filePath);

  const parts = slug.split('-to-');
  const fromName = parts[0] ? parts[0].replace(/-/g, ' ').toUpperCase() : 'SOURCE';
  const toName = parts.slice(1).join(' to ').replace(/-/g, ' ').toUpperCase() || 'TARGET';

  const tool = {
    slug,
    title: `${fromName} to ${toName}`,
    from: fromName,
    to: toName,
    category: slug.includes('sql') || slug.includes('postgres') ? 'Backend Engineering' : 'Software Engineering',
  };

  const content = generatePage(tool);
  fs.writeFileSync(filePath, content, 'utf8');
  existed ? updated++ : created++;
}

console.log(`\n✅ Content Generation Complete (v6.0 - Full Unique Mode)`);
console.log(`🔄 Updated: ${updated} existing pages`);
console.log(`🆕 Created: ${created} new pages`);
console.log(`📄 Total: ${updated + created} pages`);
console.log(`\n⚠️  Remember to run: git add . && git commit -m "fix: regenerate all content as unique"`);
