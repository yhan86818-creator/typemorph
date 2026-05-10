const fs = require('fs');
const path = require('path');

try {
  const tsContent = fs.readFileSync('src/data/converters.ts', 'utf8');

  // Find the start of the array
  const arrayStart = tsContent.indexOf('[');
  const arrayStr = tsContent.substring(arrayStart);

  // eval the array
  const converters = eval(arrayStr);

  // Create content dir
  const contentDir = path.join(__dirname, 'src/data/content');
  if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
  }

  for (const c of converters) {
      const contentFilePath = path.join(contentDir, `${c.slug}.html`);
      fs.writeFileSync(contentFilePath, c.content.trim(), 'utf8');
  }

  // Now generate the new converters.ts
  let newTs = `export interface Converter {
  slug: string;
  title: string;
  description: string;
  h1: string;
}

export const converters: Converter[] = [
`;

  for (const c of converters) {
      newTs += `  {
    slug: ${JSON.stringify(c.slug)},
    title: ${JSON.stringify(c.title)},
    description: ${JSON.stringify(c.description)},
    h1: ${JSON.stringify(c.h1)}
  },
`;
  }

  newTs += `];\n`;

  fs.writeFileSync('src/data/converters.ts', newTs, 'utf8');
  console.log('Successfully split converters into content files!');
} catch (e) {
  console.error('Error:', e);
}
