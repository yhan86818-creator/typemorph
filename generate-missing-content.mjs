import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const missing = [
  { slug: 'json-to-pytorch', title: 'JSON to PyTorch Dataset', tech: 'PyTorch', category: 'Data Science & ML', desc: 'Convert JSON data structures into PyTorch Dataset classes and DataLoader configurations for training deep learning models.' },
  { slug: 'json-to-tensorflow', title: 'JSON to TensorFlow Dataset', tech: 'TensorFlow', category: 'Data Science & ML', desc: 'Transform JSON payloads into TensorFlow tf.data.Dataset pipelines for high-performance ML model training.' },
  { slug: 'json-to-solidity', title: 'JSON to Solidity Struct', tech: 'Solidity', category: 'Blockchain & Web3', desc: 'Convert JSON schemas into Solidity smart contract structs and ABI definitions for Ethereum and EVM-compatible chains.' },
  { slug: 'json-to-mermaid', title: 'JSON to Mermaid Diagram', tech: 'Mermaid.js', category: 'Visualization', desc: 'Transform JSON data structures into Mermaid.js diagram syntax for flowcharts, ER diagrams, and sequence diagrams.' },
  { slug: 'json-to-jest-mock', title: 'JSON to Jest Mock', tech: 'Jest', category: 'Testing', desc: 'Generate Jest mock data and jest.mock() factory functions from your JSON response structures for unit testing.' },
  { slug: 'json-to-cypress-fixture', title: 'JSON to Cypress Fixture', tech: 'Cypress', category: 'Testing', desc: 'Convert JSON API responses into Cypress fixture files and cy.intercept() stubs for end-to-end testing.' },
  { slug: 'json-to-playwright-mock', title: 'JSON to Playwright Mock', tech: 'Playwright', category: 'Testing', desc: 'Transform JSON data into Playwright page.route() mock handlers for reliable browser automation testing.' },
  { slug: 'json-to-arduino', title: 'JSON to Arduino Struct', tech: 'Arduino/C++', category: 'Embedded Systems', desc: 'Convert JSON configuration data into Arduino-compatible C++ structs and PROGMEM data for embedded systems.' },
  { slug: 'json-to-rust-embedded', title: 'JSON to Rust Embedded', tech: 'Rust (no_std)', category: 'Embedded Systems', desc: 'Generate Rust no_std compatible data structures from JSON for bare-metal and embedded Rust programming.' },
  { slug: 'json-to-latex-table', title: 'JSON to LaTeX Table', tech: 'LaTeX', category: 'Documentation', desc: 'Convert JSON arrays into professional LaTeX tabular environments for academic papers and technical documentation.' },
  { slug: 'json-to-bibtex', title: 'JSON to BibTeX', tech: 'BibTeX', category: 'Documentation', desc: 'Transform JSON metadata into BibTeX citation entries for academic bibliography management in LaTeX documents.' },
  { slug: 'json-to-alpine-data', title: 'JSON to Alpine.js Data', tech: 'Alpine.js', category: 'Frontend', desc: 'Convert JSON structures into Alpine.js x-data component definitions for lightweight reactive UI development.' },
  { slug: 'json-to-htmx-trigger', title: 'JSON to HTMX Config', tech: 'HTMX', category: 'Frontend', desc: 'Generate HTMX hx-vals attributes and server-side JSON response configs for hypermedia-driven web applications.' },
  { slug: 'json-to-docusaurus-mdx', title: 'JSON to Docusaurus MDX', tech: 'Docusaurus', category: 'Documentation', desc: 'Convert JSON data into Docusaurus MDX components and frontmatter configurations for technical documentation sites.' },
  { slug: 'json-to-jekyll-yaml', title: 'JSON to Jekyll YAML', tech: 'Jekyll', category: 'Static Sites', desc: 'Transform JSON content into Jekyll front matter YAML and _data file structures for static site generation.' },
  { slug: 'json-to-hugo-toml', title: 'JSON to Hugo TOML', tech: 'Hugo', category: 'Static Sites', desc: 'Convert JSON configurations into Hugo TOML front matter and config.toml settings for the fastest static site generator.' },
  { slug: 'json-to-pocketbase-schema', title: 'JSON to PocketBase Schema', tech: 'PocketBase', category: 'Backend', desc: 'Generate PocketBase collection schema definitions from JSON data models for the open-source Firebase alternative.' },
  { slug: 'json-to-directus-schema', title: 'JSON to Directus Schema', tech: 'Directus', category: 'Backend', desc: 'Convert JSON structures into Directus collection and field configuration schemas for headless CMS management.' },
  { slug: 'json-to-strapi-model', title: 'JSON to Strapi Model', tech: 'Strapi', category: 'Backend', desc: 'Transform JSON payloads into Strapi v4 content-type schema definitions and API response structures.' },
  { slug: 'json-to-ghost-theme-data', title: 'JSON to Ghost Theme Data', tech: 'Ghost CMS', category: 'CMS', desc: 'Convert JSON data into Ghost CMS theme Handlebars helpers and context data for custom publishing themes.' },
  { slug: 'json-to-wordpress-metadata', title: 'JSON to WordPress Meta', tech: 'WordPress', category: 'CMS', desc: 'Generate WordPress post meta, custom field definitions, and WP_Query arguments from JSON data structures.' },
  { slug: 'json-to-unity-csharp', title: 'JSON to Unity C# Class', tech: 'Unity/C#', category: 'Game Development', desc: 'Convert JSON game data into Unity-compatible C# serializable classes for ScriptableObjects and JsonUtility parsing.' },
  { slug: 'json-to-godot-gdscript', title: 'JSON to Godot GDScript', tech: 'Godot Engine', category: 'Game Development', desc: 'Transform JSON resource files into Godot 4 GDScript classes and Resource definitions for game data management.' },
  { slug: 'json-to-r-dataframe', title: 'JSON to R DataFrame', tech: 'R Language', category: 'Data Science & ML', desc: 'Convert JSON datasets into R data.frame() and tibble() definitions for statistical analysis and data visualization.' },
  { slug: 'json-to-pandas', title: 'JSON to Pandas DataFrame', tech: 'Pandas', category: 'Data Science & ML', desc: 'Generate Python Pandas DataFrame construction code from JSON data for data analysis and machine learning pipelines.' },
  { slug: 'json-to-owasp-checklist', title: 'JSON to OWASP Checklist', tech: 'OWASP', category: 'Security', desc: 'Transform JSON API definitions into OWASP security checklist items and vulnerability assessment configurations.' },
  { slug: 'json-to-aws-iam-policy', title: 'JSON to AWS IAM Policy', tech: 'AWS IAM', category: 'Cloud & DevOps', desc: 'Convert JSON resource definitions into AWS IAM policy documents with proper Principal, Action, and Resource statements.' },
  { slug: 'json-to-kubernetes-network-policy', title: 'JSON to K8s NetworkPolicy', tech: 'Kubernetes', category: 'Cloud & DevOps', desc: 'Generate Kubernetes NetworkPolicy YAML manifests from JSON service definitions for cluster network security.' },
  { slug: 'json-to-terraform-resource', title: 'JSON to Terraform Resource', tech: 'Terraform', category: 'Cloud & DevOps', desc: 'Convert JSON infrastructure data into Terraform HCL resource blocks and variable definitions for IaC management.' },
  { slug: 'json-to-graphql-mutation', title: 'JSON to GraphQL Mutation', tech: 'GraphQL', category: 'API', desc: 'Transform JSON payloads into GraphQL mutation definitions, input types, and resolver function stubs.' },
  { slug: 'json-to-openapi-3', title: 'JSON to OpenAPI 3.0', tech: 'OpenAPI 3.0', category: 'API', desc: 'Convert JSON response examples into full OpenAPI 3.0 schema definitions with components and path specifications.' },
  { slug: 'json-to-asyncapi', title: 'JSON to AsyncAPI Schema', tech: 'AsyncAPI', category: 'API', desc: 'Generate AsyncAPI 2.x message schema definitions from JSON event payloads for event-driven architecture documentation.' },
  { slug: 'json-to-storybook-args', title: 'JSON to Storybook Args', tech: 'Storybook', category: 'Frontend', desc: 'Convert JSON data into Storybook argTypes, args, and Story definitions for component-driven UI development.' },
  { slug: 'json-to-tailwind-theme', title: 'JSON to Tailwind Theme', tech: 'Tailwind CSS', category: 'Frontend', desc: 'Transform JSON design tokens into Tailwind CSS tailwind.config.js theme extension configurations.' },
  { slug: 'json-to-nestjs-dto', title: 'JSON to NestJS DTO', tech: 'NestJS', category: 'Backend', desc: 'Generate NestJS Data Transfer Objects with class-validator decorators from JSON API request and response schemas.' },
  { slug: 'json-to-go-fiber-schema', title: 'JSON to Go Fiber Schema', tech: 'Go Fiber', category: 'Backend', desc: 'Convert JSON payloads into Go Fiber request parsing structs and validation schemas for high-performance Go APIs.' },
  { slug: 'json-to-swiftui-preview', title: 'JSON to SwiftUI Preview', tech: 'SwiftUI', category: 'Mobile', desc: 'Transform JSON mock data into SwiftUI PreviewProvider data and Codable model definitions for iOS development.' },
  { slug: 'json-to-jetpack-compose-preview', title: 'JSON to Jetpack Compose', tech: 'Jetpack Compose', category: 'Mobile', desc: 'Convert JSON data models into Jetpack Compose @Preview data and Kotlin data class definitions for Android UI.' },
  { slug: 'json-to-markdown-table', title: 'JSON to Markdown Table', tech: 'Markdown', category: 'Documentation', desc: 'Transform JSON arrays into formatted GitHub Flavored Markdown tables for READMEs and documentation pages.' },
  { slug: 'json-to-asciidoc-table', title: 'JSON to AsciiDoc Table', tech: 'AsciiDoc', category: 'Documentation', desc: 'Convert JSON data into AsciiDoc table syntax for technical documentation and book publishing workflows.' },
  { slug: 'json-to-pwa-manifest', title: 'JSON to PWA Manifest', tech: 'PWA', category: 'Frontend', desc: 'Generate Web App Manifest (manifest.json) configurations from JSON app data for Progressive Web App development.' },
  { slug: 'json-to-vscode-snippet', title: 'JSON to VS Code Snippet', tech: 'VS Code', category: 'Developer Tools', desc: 'Convert JSON data structures into VS Code user snippet definitions for rapid code template insertion.' },
];

function generateContent(tool) {
  const { slug, title, tech, category, desc } = tool;
  const name = title.split(' - ')[0];
  
  return `<p>
  <strong>${title}</strong> is a specialized utility within the TypeFlow Pro workbench, 
  designed to help ${category} engineers eliminate the manual, error-prone process of 
  translating JSON data structures into ${tech} code. ${desc}
</p>

<h2>Why ${category} Engineers Need This Tool</h2>
<p>
  Working with ${tech} requires precise data modeling. When you receive a JSON payload from 
  an API or configuration file, manually transcribing it into the exact format ${tech} expects 
  is tedious and introduces bugs. The <strong>${name}</strong> automates this entirely, 
  ensuring your ${tech} output is syntactically correct and follows idiomatic conventions 
  the first time, every time.
</p>

<h2>How It Works: Local-First Processing</h2>
<p>
  Unlike online tools that send your data to remote servers, TypeFlow Pro executes all 
  conversion logic 100% inside your browser. This means your proprietary JSON schemas, 
  API keys, and sensitive payload structures never leave your machine. This is critical 
  for teams working under GDPR, SOC2, or internal data governance policies.
</p>

<h2>Key Features of the ${name}</h2>
<ul>
  <li><strong>Instant Real-Time Conversion:</strong> Powered by the Monaco Editor (VS Code's core), 
  your ${tech} output updates as you type. No waiting, no round-trips to a server.</li>
  
  <li><strong>AI-Assisted Smart Parse:</strong> Integrated with Google Gemini 1.5, the 
  Smart Parse feature can clean malformed or deeply nested JSON before feeding it to the 
  ${tech} generator, dramatically reducing preprocessing time.</li>
  
  <li><strong>Production-Ready Output:</strong> The generated ${tech} code follows official 
  documentation standards and community best practices, not generic templates.</li>
  
  <li><strong>Zero Configuration:</strong> No npm install, no Docker container, no API key 
  required for basic conversion. Open the tool and start working immediately.</li>
</ul>

<h2>Common Use Cases for ${category} Workflows</h2>
<p>
  Engineers working with ${tech} commonly encounter JSON in the following scenarios:
</p>
<ul>
  <li>Converting third-party API documentation examples into working ${tech} schemas</li>
  <li>Migrating legacy configuration files into ${tech} compatible formats</li>
  <li>Bootstrapping new projects by generating boilerplate ${tech} definitions from sample data</li>
  <li>Validating that existing ${tech} structures match incoming JSON payloads in CI pipelines</li>
</ul>

<h2>TypeFlow Pro vs. Manual Conversion</h2>
<p>
  Manual JSON-to-${tech} conversion for even a moderately complex payload can take 15–30 
  minutes and is a common source of type errors. With the <strong>${name}</strong>, the 
  same task takes seconds. Pro users also gain access to batch processing, allowing entire 
  directories of JSON files to be converted simultaneously—a feature critical for large-scale 
  migrations in the ${category} space.
</p>

<h2>Security and Compliance</h2>
<p>
  Because TypeFlow Pro requires no account registration and performs no data uploads, it 
  passes security audits in air-gapped development environments. Many enterprise teams in 
  finance, healthcare, and government use TypeFlow Pro specifically because their data 
  compliance policies prohibit sending schemas to third-party SaaS tools.
</p>

<p>
  Start using the <strong>${name}</strong> today and bring the same reliability and speed 
  to your ${tech} workflow that TypeFlow Pro delivers across 170+ specialized developer tools.
</p>`;
}

const contentDir = path.join(__dirname, 'src', 'data', 'content');
let created = 0;

for (const tool of missing) {
  const filePath = path.join(contentDir, `${tool.slug}.html`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, generateContent(tool), 'utf8');
    console.log(`✅ Created: ${tool.slug}.html`);
    created++;
  } else {
    console.log(`⏭️  Exists: ${tool.slug}.html`);
  }
}

console.log(`\nDone! Created ${created} new content files.`);
