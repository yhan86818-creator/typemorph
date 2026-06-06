const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const FILES = [path.join(ROOT, 'package.json')];

function getAllFiles(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcFiles = getAllFiles(SRC_DIR, ['.ts', '.tsx', '.json']);
const allFiles = [...srcFiles, ...FILES];

let count = 0;
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Order matters: replace the most specific first
  content = content.replace(/TypeFlow Pro/g, 'TypeMorph');
  content = content.replace(/TypeFlowApp/g, 'TypeMorphApp');
  content = content.replace(/TypeFlow Finance/g, 'TypeMorph Finance');
  content = content.replace(/TypeFlow/g, 'TypeMorph');
  content = content.replace(/typeflow-pro/g, 'typemorph');
  content = content.replace(/typeflow/g, 'typemorph');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
    count++;
  }
}

console.log(`\nDone. Updated ${count} files.`);
