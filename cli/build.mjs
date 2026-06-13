import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/cli.js',
  banner: { js: '#!/usr/bin/env node' },
  // Resolve @/ alias to the web app's src/
  alias: { '@': '../src' },
  // Node built-ins stay external
  external: ['fs', 'path', 'readline', 'crypto', 'os', 'stream', 'util', 'buffer', 'events'],
  minify: true,
  legalComments: 'none',
  tsconfig: '../tsconfig.json',
});

console.log('✅  dist/cli.js built');
