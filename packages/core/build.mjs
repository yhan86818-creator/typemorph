import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  alias: { '@': '../../../src' },
  external: ['fs', 'path', 'readline', 'crypto', 'os', 'stream', 'util', 'buffer', 'events', 'worker_threads'],
  tsconfig: '../../../tsconfig.json',
  legalComments: 'none',
};

// ESM — for VS Code extension (bundler) and modern Node consumers
await build({
  ...shared,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
});

// CJS — for VS Code extension host (Node.js), CLI
await build({
  ...shared,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.cjs',
});

console.log('✅  typemorph-core built (ESM + CJS)');
