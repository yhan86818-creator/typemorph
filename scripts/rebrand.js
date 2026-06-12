const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.wrangler', '.git', 'dist', 'out']);
const ALLOWED_EXTS = ['.ts', '.tsx', '.json', '.html', '.md', '.js', '.mjs', '.css', '.toml'];

function getAllFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else if (ALLOWED_EXTS.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = getAllFiles(ROOT);

let count = 0;
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Order matters: replace the most specific first
  content = content.replace(/TypeMorph/g, 'TypeMorph');
  content = content.replace(/TypeMorphApp/g, 'TypeMorphApp');
  content = content.replace(/TypeMorph Finance/g, 'TypeMorph Finance');
  content = content.replace(/TypeMorph/g, 'TypeMorph');
  content = content.replace(/typemorph/g, 'typemorph');
  content = content.replace(/typemorph/g, 'typemorph');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
    count++;
  }
}

console.log(`\nDone. Updated ${count} files.`);
