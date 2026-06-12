const fs = require('fs');
const path = require('path');

const dir = './src/data/content';

const targets = [
  'fix-to-json.html',
  'json-to-arduino.html',
  'json-to-csharp-class.html',
  'json-to-godot-gdscript.html',
  'json-to-grpc-web.html',
  'json-to-haskell-type.html',
  'json-to-php-dto-class.html',
  'json-to-r-dataframe.html',
  'json-to-solidity.html',
  'json-to-toml.html',
  'swift-mt-to-mx.html',
  'swift-mt103-to-json.html',
  'toml-to-typescript.html',
  'yaml-to-rust.html',
];

targets.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all variations
  const before = content.length;
  content = content.replace(/TypeMorph/g, 'TypeMorph');
  content = content.replace(/TypeMorph/g, 'TypeMorph');
  content = content.replace(/typemorph/g, 'typemorph');
  
  fs.writeFileSync(filePath, content, 'utf8');
  const count = (content.match(/typemorph/gi) || []).length - (content.match(/typemorph/gi) || []).length;
  console.log(`✓ ${f} — fixed`);
});

console.log(`\nDone. Fixed ${targets.length} files.`);
