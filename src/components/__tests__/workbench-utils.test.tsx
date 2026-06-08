import { describe, expect, test } from 'vitest';
import { getWorkbenchEditorText } from '../workbench-utils';

describe('getWorkbenchEditorText', () => {
  test('returns default prompt when no output exists', () => {
    const text = getWorkbenchEditorText('typescript', {}, {});
    expect(text).toBe('// Generate code...');
  });

  test('returns loading text when output is generating', () => {
    const text = getWorkbenchEditorText('typescript', { typescript: '' }, { typescript: { status: 'loading' } });
    expect(text).toBe('// Generating typescript...');
  });

  test('returns error text when output state is error', () => {
    const text = getWorkbenchEditorText(
      'typescript',
      { typescript: 'export interface Root {}' },
      { typescript: { status: 'error', message: '// Failed to generate typescript: broken' } }
    );
    expect(text).toBe('// Failed to generate typescript: broken');
  });

  test('returns unsupported text when output state is unsupported', () => {
    const text = getWorkbenchEditorText(
      'go',
      { go: '' },
      { go: { status: 'unsupported', message: '// Unsupported output: go' } }
    );
    expect(text).toBe('// Unsupported output: go');
  });

  test('returns existing output when idle', () => {
    const text = getWorkbenchEditorText(
      'zod',
      { zod: 'import { z } from "zod";' },
      { zod: { status: 'idle' } }
    );
    expect(text).toBe('import { z } from "zod";');
  });
});
