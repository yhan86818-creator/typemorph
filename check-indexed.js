const fs = require('fs');
const path = require('path');

// Dynamically read whitelisted slugs from src/lib/seo.ts
const seoFile = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'seo.ts'), 'utf8');
const matches = seoFile.match(/INDEXED_EN_SLUGS\s*=\s*new\s*Set\(\s*\[([\s\S]*?)\]\s*\)/);
const indexedSlugs = new Set(
  matches ? matches[1].split(',').map(s => s.trim().replace(/['"\r\n]/g, '')).filter(s => s && !s.startsWith('//')) : []
);

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
