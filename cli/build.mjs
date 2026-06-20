import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'fs';

mkdirSync('dist', { recursive: true });

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

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
  define: { __CLI_VERSION__: JSON.stringify(version) },
  minify: true,
  legalComments: 'none',
  tsconfig: '../tsconfig.json',
});

console.log('✅  dist/cli.js built');
