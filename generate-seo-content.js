const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'data', 'content');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const content = {
  'json-to-react-query': `
    <p>Modern React applications require robust data fetching strategies. The <strong>JSON to React Query Hooks</strong> generator automates the creation of <code>@tanstack/react-query</code> hooks from standard JSON payloads, saving hours of manual TypeScript typing.</p>
    <h2>Why Automate React Query?</h2>
    <p>Writing boilerplate for <code>useQuery</code> and <code>useMutation</code> is repetitive. By using TypeMorph's local engine, you can instantly turn a sample API response into a fully typed hook. The generator automatically creates the necessary TypeScript interfaces for the response data and integrates them seamlessly with TanStack Query's API.</p>
    <h3>Type-Safe Data Fetching</h3>
    <p>Our generator doesn't just create a generic hook; it creates deeply nested TypeScript interfaces representing your JSON. This ensures that when you access <code>data</code> from your <code>useQuery</code> result, your IDE provides full auto-completion for every field, array, and nested object.</p>
    <h2>Zero-Server Privacy</h2>
    <p>Your API responses often contain sensitive mock data or proprietary schemas. Because TypeMorph runs 100% locally in your browser, your JSON is never transmitted to a remote server, ensuring complete compliance with enterprise security policies.</p>
  `,
  'json-to-redux-slice': `
    <p>State management in React is vastly improved by Redux Toolkit (RTK), but writing slices still involves boilerplate. The <strong>JSON to Redux Slice</strong> generator creates type-safe RTK slices from your JSON state representations.</p>
    <h2>Automated RTK Slice Generation</h2>
    <p>Simply paste a JSON object representing your initial state, and the generator will scaffold the <code>createSlice</code> function, complete with strongly-typed <code>initialState</code> and placeholder reducers. The TypeScript interfaces are automatically inferred from your JSON values.</p>
    <h3>Deep Type Inference</h3>
    <p>Whether your state contains complex arrays, nested configuration objects, or nullable fields, the TypeMorph engine parses the structure and generates the corresponding TypeScript types. This guarantees that your <code>PayloadAction</code> types are strictly enforced.</p>
    <h2>Local-First Processing</h2>
    <p>Redux states often mirror sensitive business logic. By processing your schemas entirely within your browser, TypeMorph ensures that your application architecture remains completely private.</p>
  `,
  'json-to-pinia-store': `
    <p>Vue 3's Pinia is the modern standard for state management. The <strong>JSON to Pinia Store</strong> generator accelerates Vue development by scaffolding fully-typed Pinia stores from standard JSON payloads.</p>
    <h2>Type-Safe Vue State</h2>
    <p>The generator parses your JSON and creates the necessary TypeScript interfaces, then scaffolds a <code>defineStore</code> setup. The <code>state</code> function is strictly typed based on your JSON schema, providing comprehensive auto-completion across your Vue components.</p>
    <h3>Composition API Ready</h3>
    <p>The output is tailored for modern Vue 3 Composition API workflows. It automatically categorizes nested objects and arrays into distinct types, ensuring that your Pinia store remains maintainable and error-free as your application scales.</p>
    <h2>Secure & Private</h2>
    <p>Since Pinia stores often contain proprietary data structures, it's crucial to keep your schemas secure. TypeMorph's local-first architecture guarantees that your JSON is processed entirely on your machine.</p>
  `,
  'json-to-supabase-type': `
    <p>Supabase provides powerful serverless Postgres capabilities, but maintaining TypeScript types for your database can be tedious. The <strong>JSON to Supabase Database Types</strong> tool automates this by generating the necessary interface definitions directly from JSON samples.</p>
    <h2>Bridging the Type Gap</h2>
    <p>By pasting a JSON representation of a database row or API response, the engine infers the underlying Postgres schema types. It correctly handles nullable fields and arrays, formatting the output to match the expected Supabase <code>Database</code> type structure.</p>
    <h3>End-to-End Type Safety</h3>
    <p>Integrating these generated types with the Supabase JavaScript client ensures that every <code>select()</code>, <code>insert()</code>, and <code>update()</code> operation is strictly validated at compile-time, drastically reducing runtime errors.</p>
    <h2>100% Client-Side Processing</h2>
    <p>Database schemas are highly confidential. TypeMorph processes your JSON exclusively within your browser's Web Worker, ensuring zero data leakage.</p>
  `,
  'json-to-pocketbase-type': `
    <p>PocketBase is a fantastic lightweight backend, but integrating it with a type-safe frontend requires accurate type definitions. The <strong>JSON to PocketBase Types</strong> generator creates the necessary TypeScript interfaces for your PocketBase collections.</p>
    <h2>Automating Collection Types</h2>
    <p>Simply provide a JSON snippet of a PocketBase record, and the generator will create TypeScript interfaces that include standard fields like <code>id</code>, <code>created</code>, and <code>updated</code>. It recursively parses nested relations and array fields to ensure complete type coverage.</p>
    <h3>Seamless Frontend Integration</h3>
    <p>These generated types can be plugged directly into the PocketBase JavaScript SDK, enabling robust auto-completion and compile-time validation for all your CRUD operations in SvelteKit, React, or Vue.</p>
    <h2>Local & Secure</h2>
    <p>Protect your backend schema architecture. TypeMorph guarantees that your data structures are analyzed and converted entirely locally.</p>
  `,
  'json-to-lucia-auth-schema': `
    <p>Lucia Auth provides unparalleled flexibility for session-based authentication. The <strong>JSON to Lucia Auth Schema</strong> tool accelerates your setup by generating the underlying database schema definitions from JSON.</p>
    <h2>Streamlined Database Setup</h2>
    <p>Whether you're using Prisma, Drizzle, or raw SQL, this tool infers the user and session attributes from your JSON sample and generates the appropriate schema scaffolding. It ensures that required fields like <code>id</code> and <code>expires_at</code> are correctly typed.</p>
    <h3>Custom User Attributes</h3>
    <p>Lucia shines when you need custom user attributes. The generator seamlessly incorporates any additional data fields from your JSON into the generated TypeScript interfaces and database schemas.</p>
    <h2>Zero Data Telemetry</h2>
    <p>Authentication schemas are the core of your application's security. With TypeMorph, your JSON structures are processed locally, ensuring no third party ever sees your database design.</p>
  `,
  'json-to-nextauth-config': `
    <p>NextAuth.js (Auth.js) is the standard for Next.js authentication, but configuring robust session types can be tricky. The <strong>JSON to NextAuth Config</strong> tool generates type-safe configuration blocks and module augmentations from JSON.</p>
    <h2>Type-Safe Sessions</h2>
    <p>By providing a JSON sample of your desired session object, the tool generates the TypeScript <code>declare module "next-auth"</code> block. This ensures that custom fields like <code>role</code> or <code>tenantId</code> are strongly typed across your Next.js application.</p>
    <h3>Provider Configuration</h3>
    <p>The generator also scaffolds boilerplate for NextAuth providers, ensuring that profile callbacks map correctly to your custom session types.</p>
    <h2>Secure Local Generation</h2>
    <p>Your authentication payload structures remain strictly private. TypeMorph performs all inference and code generation in the browser.</p>
  `,
  'json-to-scala-case-class': `
    <p>Scala's functional paradigms rely heavily on immutable data structures. The <strong>JSON to Scala Case Class</strong> generator transforms JSON payloads into idiomatic Scala case classes, perfect for backend development.</p>
    <h2>Idiomatic Functional Modeling</h2>
    <p>The engine parses JSON objects and generates concise case classes. It maps JSON arrays to Scala <code>List</code> types and correctly infers <code>Option[T]</code> for nullable or missing fields, ensuring robust functional data handling.</p>
    <h3>JSON Codec Boilerplate</h3>
    <p>Beyond the case classes, the generator can provide scaffolding for popular JSON libraries like Circe or Play JSON, drastically reducing the time spent writing boilerplate decoders.</p>
    <h2>Enterprise Privacy</h2>
    <p>Scala is heavily used in enterprise environments where data privacy is paramount. TypeMorph's local execution guarantees your proprietary JSON schemas never leave your device.</p>
  `,
  'json-to-elm-decoder': `
    <p>Elm promises "no runtime exceptions," but writing JSON decoders by hand is notoriously time-consuming. The <strong>JSON to Elm Decoder</strong> tool automates the creation of type aliases and JSON decoders from sample data.</p>
    <h2>Automated Decoder Pipelines</h2>
    <p>Provide a JSON payload, and the tool generates both the Elm <code>type alias</code> and the corresponding <code>Json.Decode.Decoder</code> function. It handles nested records, lists, and <code>Maybe</code> types flawlessly using the standard <code>Json.Decode.Pipeline</code> syntax.</p>
    <h3>100% Type Safety</h3>
    <p>The generated decoders ensure that your external API data strictly matches your Elm application's expectations, maintaining the language's core promise of stability.</p>
    <h2>Private Processing</h2>
    <p>Your API payloads are processed entirely on the client side. TypeMorph's zero-server architecture keeps your data completely secure.</p>
  `,
  'json-to-ruby-struct': `
    <p>Ruby developers often need quick, structured representations of JSON data. The <strong>JSON to Ruby Struct</strong> generator converts JSON into idiomatic Ruby <code>Struct</code> or <code>Data</code> classes.</p>
    <h2>Clean Ruby Data Models</h2>
    <p>The generator parses your JSON keys, converts them to snake_case, and generates Ruby struct definitions. This is highly useful for rapidly mapping API responses to lightweight, accessible objects without the overhead of ActiveRecord.</p>
    <h3>Handling Nested Data</h3>
    <p>For complex JSON, the tool recursively generates nested structs, providing a clean, hierarchical object representation that is easy to interact with in your Ruby scripts or Rails applications.</p>
    <h2>Local-First Security</h2>
    <p>Because TypeMorph runs completely in your browser, you can safely paste production API payloads or database dumps without risking data exposure.</p>
  `
};

for (const [slug, html] of Object.entries(content)) {
  const filePath = path.join(dir, slug + '.html');
  fs.writeFileSync(filePath, html.trim(), 'utf8');
}

console.log('Successfully generated 10 HTML content files.');
