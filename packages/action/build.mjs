import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.js',
  external: [],  // bundle everything including @actions/* so the action is self-contained
  minify: false, // keep readable for debugging in Actions logs
  legalComments: 'none',
  tsconfig: '../../tsconfig.json',
});

console.log('✅  dist/index.js built');
