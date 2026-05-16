import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, 'src', 'data', 'content');

const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.html'));

console.log(`\n🕵️  AI CONTENT QUALITY AUDIT START (Target: ${files.length} files)\n`);

let failCount = 0;
let results = [];

// AI Detector Patterns
const aiPatterns = ['delve into', 'testament to', 'seamlessly', 'comprehensive', 'game-changer'];

for (const file of files) {
  const content = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const wordCount = content.split(/\s+/).length;
  
  let issues = [];
  
  // 1. Word Count Check
  if (wordCount < 1000) {
    issues.push(`LOW VOLUME: ${wordCount} words`);
  }

  // 2. AI Pattern Check
  for (const pattern of aiPatterns) {
    if (content.toLowerCase().includes(pattern)) {
      issues.push(`AI PATTERN FOUND: "${pattern}"`);
    }
  }

  if (issues.length > 0) {
    failCount++;
    results.push({ file, issues });
  }
}

// 3. Duplicate Check (Sample 10 random files against each other)
console.log(`🔍 Checking for Cross-File Duplication (Structural Overlap)...`);
const sampleSize = 10;
const sampleFiles = files.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
let maxOverlap = 0;

for (let i = 0; i < sampleFiles.length; i++) {
  for (let j = i + 1; j < sampleFiles.length; j++) {
    const c1 = fs.readFileSync(path.join(contentDir, sampleFiles[i]), 'utf8');
    const c2 = fs.readFileSync(path.join(contentDir, sampleFiles[j]), 'utf8');
    
    // Simple overlap check: How many sentences are identical?
    const s1 = new Set(c1.split('. '));
    const s2 = new Set(c2.split('. '));
    const intersection = [...s1].filter(x => s2.has(x));
    const overlapPercent = (intersection.length / Math.min(s1.size, s2.size)) * 100;
    if (overlapPercent > maxOverlap) maxOverlap = overlapPercent;
  }
}

console.log(`\n--- AUDIT SUMMARY ---`);
console.log(`✅ Total Files: ${files.length}`);
console.log(`❌ Failed Files: ${failCount}`);
console.log(`🧬 Max Structural Overlap: ${maxOverlap.toFixed(2)}% (Target: < 20%)`);

if (failCount > 0) {
  console.log(`\n🚩 ISSUES FOUND:`);
  results.slice(0, 5).forEach(r => console.log(` - ${r.file}: ${r.issues.join(', ')}`));
  if (results.length > 5) console.log(` ... and ${results.length - 5} more.`);
} else {
  console.log(`\n🏆 ALL FILES PASSED QUALITY AUDIT!`);
}
