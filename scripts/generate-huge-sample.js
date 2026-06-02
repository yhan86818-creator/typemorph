const fs = require('fs');
const path = require('path');
const out = { items: [] };
for (let i = 0; i < 2000; i++) {
  out.items.push({
    id: i,
    name: 'name' + i,
    meta: { flag: i % 2 === 0, values: [1, 2, 3], info: { nested: { v: i } } },
    tags: ['a', 'b', 'c']
  });
}
const p = path.join(__dirname, '..', 'src', 'lib', '__bench__', 'samples', 'huge.json');
fs.writeFileSync(p, JSON.stringify(out));
console.log('wrote', p);
