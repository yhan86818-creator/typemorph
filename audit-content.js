const fs = require('fs');
const path = require('path');
const dir = './src/data/content';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let thin = [];
let devDiary = [];
let typeflow = [];
let veryShort = [];

files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  if (c.includes('Dev Diary')) devDiary.push(f);
  if (c.toLowerCase().includes('typeflow')) typeflow.push(f);
  if (c.length < 600) thin.push({ file: f, size: c.length });
});

console.log('=== "Dev Diary" pattern (old boilerplate - RISK) ===');
devDiary.forEach(f => console.log(' ', f));
console.log(`Total: ${devDiary.length}\n`);

console.log('=== Still says "TypeFlow" (branding bug) ===');
typeflow.forEach(f => console.log(' ', f));
console.log(`Total: ${typeflow.length}\n`);

console.log('=== Very short content (<600 bytes, thin content risk) ===');
thin.forEach(({file, size}) => console.log(`  ${file} (${size}b)`));
console.log(`Total: ${thin.length}\n`);

console.log(`Total HTML files: ${files.length}`);
