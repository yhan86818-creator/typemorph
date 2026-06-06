const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'data', 'content');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const content = {
  'json-to-graphql-resolver': `
    <p>Building GraphQL APIs requires writing extensive resolver boilerplate. The <strong>JSON to GraphQL Resolver</strong> generator automates this process by parsing your target JSON response and scaffolding the corresponding resolver functions.</p>
    <h2>Automating GraphQL Backends</h2>
    <p>By providing a sample of the data your API needs to return, this tool generates the boilerplate code for queries and mutations. It automatically maps nested objects to their respective type resolvers, ensuring your GraphQL schema accurately reflects your data architecture.</p>
    <h3>Accelerated Development</h3>
    <p>Instead of manually writing out <code>parent, args, context, info</code> signatures for every nested field, TypeMorph generates clean, structured resolver maps that you can immediately plug into Apollo Server or Yoga.</p>
    <h2>100% Local Processing</h2>
    <p>Your API responses are the blueprint of your backend. With our zero-server architecture, your JSON data is processed entirely within your browser, ensuring no intellectual property ever leaves your machine.</p>
  `,
  'json-to-django-rest-serializer': `
    <p>Django REST Framework (DRF) is powerful, but creating serializers for complex nested JSON can be tedious. The <strong>JSON to Django REST Serializer</strong> tool generates robust, type-hinted Python serializers instantly.</p>
    <h2>Streamlined API Development</h2>
    <p>Simply paste your target JSON payload, and the engine generates <code>serializers.Serializer</code> or <code>serializers.ModelSerializer</code> classes. It correctly identifies field types like <code>CharField</code>, <code>IntegerField</code>, and <code>DateTimeField</code> based on your data.</p>
    <h3>Nested Serializers Made Easy</h3>
    <p>For complex JSON arrays or nested objects, the tool automatically scaffolds nested serializer classes and links them using <code>many=True</code> or relational fields, saving you hours of manual Python typing.</p>
    <h2>Enterprise Security</h2>
    <p>Because DRF is often used in enterprise and fintech applications, data privacy is critical. TypeMorph processes all your JSON locally, guaranteeing that your data schemas remain completely confidential.</p>
  `,
  'json-to-spring-boot-jpa': `
    <p>Java enterprise applications rely heavily on robust data modeling. The <strong>JSON to Spring Boot JPA Entity</strong> generator transforms JSON payloads into production-ready Java classes complete with Hibernate annotations.</p>
    <h2>From JSON to Relational Data</h2>
    <p>The tool parses your JSON and generates standard Java POJOs. It automatically applies JPA annotations like <code>@Entity</code>, <code>@Table</code>, <code>@Id</code>, and <code>@Column</code>, creating a seamless bridge between your API responses and your relational database.</p>
    <h3>Lombok Integration</h3>
    <p>To keep your Java code clean and modern, the generated entities utilize Project Lombok annotations such as <code>@Data</code>, <code>@NoArgsConstructor</code>, and <code>@AllArgsConstructor</code>, eliminating unnecessary getter and setter boilerplate.</p>
    <h2>Local-First Compliance</h2>
    <p>Spring Boot is the backbone of many secure enterprise systems. By running entirely in your browser, TypeMorph ensures that your database structures comply with strict data residency and privacy regulations.</p>
  `,
  'json-to-csharp-dto': `
    <p>.NET applications demand strict type safety. The <strong>JSON to C# DTO</strong> generator creates clean, idiomatic Data Transfer Objects from JSON, complete with <code>System.Text.Json</code> or Newtonsoft annotations.</p>
    <h2>Accelerate .NET Development</h2>
    <p>Paste your JSON response, and the engine will scaffold C# classes or records. It intelligently maps JSON naming conventions (like snake_case) to C# PascalCase properties using <code>[JsonPropertyName]</code> attributes.</p>
    <h3>Modern C# Features</h3>
    <p>The generator supports modern C# paradigms, including nullable reference types and <code>init</code>-only properties, ensuring your DTOs are both safe and immutable where appropriate.</p>
    <h2>Zero Data Telemetry</h2>
    <p>Your enterprise JSON contracts are sensitive. TypeMorph’s local processing guarantees that your data structures are analyzed strictly within your secure browser sandbox.</p>
  `,
  'json-to-superstruct': `
    <p>Superstruct offers a simple, composable way to validate data in JavaScript and TypeScript. The <strong>JSON to Superstruct Schema</strong> tool generates highly readable validation logic directly from JSON samples.</p>
    <h2>Readable Runtime Validation</h2>
    <p>Unlike verbose validation libraries, Superstruct schemas mirror the shape of your data. This generator analyzes your JSON and outputs a clean <code>struct()</code> definition that you can use to immediately validate incoming API requests or form data.</p>
    <h3>Type Inference</h3>
    <p>By leveraging Superstruct's <code>Infer</code> utility, the generated code also provides you with native TypeScript interfaces, giving you both runtime safety and compile-time auto-completion in a single step.</p>
    <h2>Complete Privacy</h2>
    <p>Your payload structures contain business logic. Our Web Worker-based engine ensures that your JSON never touches an external server, keeping your validation logic entirely private.</p>
  `,
  'json-to-joi': `
    <p>Joi is the industry standard for payload validation in Node.js, particularly with Hapi and Express. The <strong>JSON to Joi Schema</strong> generator instantly creates robust Joi validation rules from your JSON data.</p>
    <h2>Automated Node.js Security</h2>
    <p>Manually writing <code>Joi.object().keys(...)</code> for massive JSON payloads is error-prone. This tool recursively parses your JSON and maps every string, number, array, and object to its strict Joi equivalent.</p>
    <h3>Handling Complex Validation</h3>
    <p>The generator intelligently applies constraints based on your sample data, scaffolding the foundation for advanced rules like <code>.required()</code>, <code>.min()</code>, or pattern matching.</p>
    <h2>Secure Local Execution</h2>
    <p>API validation schemas are critical to your backend security posture. TypeMorph executes all parsing locally, ensuring your data structures remain protected from third-party interception.</p>
  `,
  'json-to-ajv': `
    <p>AJV is the fastest JSON Schema validator for Node.js. The <strong>JSON to AJV Validator</strong> tool generates both the JSON Schema draft format and the AJV compilation code needed for high-performance validation.</p>
    <h2>High-Performance Validation</h2>
    <p>AJV compiles schemas into raw JavaScript functions for maximum speed. This tool bridges the gap by taking a raw JSON sample and generating the precise JSON Schema definition that AJV expects, saving you from writing verbose schema definitions by hand.</p>
    <h3>TypeScript Integration</h3>
    <p>When used alongside the AJV compiler, the generated schemas ensure that your API endpoints can validate thousands of requests per second with strict adherence to your data contracts.</p>
    <h2>100% Client-Side Privacy</h2>
    <p>Your high-performance backend schemas are processed entirely in your browser. TypeMorph's zero-server model guarantees complete data confidentiality.</p>
  `,
  'json-to-knex-migration': `
    <p>Managing database schema changes in Node.js is much easier with Knex.js. The <strong>JSON to Knex Migration</strong> generator translates JSON data structures into Knex <code>up()</code> and <code>down()</code> migration scripts.</p>
    <h2>Automating Database Schema</h2>
    <p>Provide a JSON representation of your desired database row, and the tool will generate a <code>knex.schema.createTable</code> block. It automatically infers column types like <code>string()</code>, <code>integer()</code>, and <code>boolean()</code>.</p>
    <h3>Rapid Prototyping</h3>
    <p>For full-stack developers, this tool bridges the gap between frontend mock data and backend database reality, allowing you to scaffold your relational database in seconds.</p>
    <h2>Private & Secure</h2>
    <p>Your database design is your intellectual property. TypeMorph ensures that your migrations are generated locally, with zero network requests to external servers.</p>
  `,
  'json-to-typeorm-entity': `
    <p>TypeORM is the premier ORM for TypeScript and NestJS. The <strong>JSON to TypeORM Entity</strong> generator creates production-ready entity classes from standard JSON payloads.</p>
    <h2>Accelerating NestJS Development</h2>
    <p>By parsing your JSON, the tool generates TypeScript classes decorated with <code>@Entity()</code>, <code>@PrimaryGeneratedColumn()</code>, and <code>@Column()</code>. It significantly reduces the boilerplate required to map API data to database tables.</p>
    <h3>Type-Safe Database Access</h3>
    <p>These generated entities integrate seamlessly with the TypeORM repository pattern, ensuring that your database queries are strictly typed and safe from runtime errors.</p>
    <h2>Local-First Compliance</h2>
    <p>Enterprise database schemas must remain confidential. TypeMorph runs entirely on your local machine, ensuring your data architecture is never exposed.</p>
  `,
  'json-to-yup': `
    <p>Yup is a powerful schema builder for runtime value parsing and validation, frequently used with Formik or React Hook Form. The <strong>JSON to Yup Schema</strong> generator automates the creation of these validation schemas from JSON.</p>
    <h2>Streamlining Form Validation</h2>
    <p>Forms can be incredibly complex. By providing a sample JSON object representing your form state, this tool scaffolds the entire <code>yup.object().shape(...)</code> structure, allowing you to instantly plug it into your React components.</p>
    <h3>Nested Validation Rules</h3>
    <p>The generator correctly handles nested objects and arrays within your JSON, ensuring that multi-step forms or complex data grids are fully validated before submission.</p>
    <h2>Zero Data Telemetry</h2>
    <p>Form data often mimics sensitive user input. TypeMorph guarantees privacy by parsing your JSON and generating the Yup schemas entirely within your browser's sandbox.</p>
  `
};

for (const [slug, html] of Object.entries(content)) {
  const filePath = path.join(dir, slug + '.html');
  fs.writeFileSync(filePath, html.trim(), 'utf8');
}

console.log('Successfully generated 10 MORE HTML content files.');
