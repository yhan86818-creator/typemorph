import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  // Resolve typemorph-core directly from source (no need to build core first)
  alias: {
    'typemorph-core': '../core/src/index.ts',
    '@': '../../src',
  },
  tsconfig: '../../tsconfig.json',
  external: ['vscode', 'fs', 'path', 'crypto', 'os', 'stream', 'util', 'buffer', 'events', 'worker_threads'],
  legalComments: 'none',
  minify: false,
});

console.log('✅  typemorph-vscode built');
