const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['bin/cli.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/cli.js',
  minify: true,
  banner: { js: '#!/usr/bin/env node' },
});

console.log('  dist/cli.js  built successfully');
