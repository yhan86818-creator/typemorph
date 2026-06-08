import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';

vi.mock('@monaco-editor/react', () => {
  const React = require('react');
  const Editor = ({ value, onChange, onMount, defaultLanguage, language }: any) => {
    React.useEffect(() => {
      if (onMount) {
        onMount(
          {
            getModel: () => ({ uri: { toString: () => 'inmemory://model/1' } }),
            onDidChangeCursorPosition: () => ({ dispose: () => {} }),
            getPosition: () => null,
            getScrolledVisiblePosition: () => null,
            getLayoutInfo: () => null,
          },
          {}
        );
      }
    }, [onMount]);

    return (
      <textarea
        data-testid={defaultLanguage ? 'input-editor' : 'output-editor'}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  };

  return {
    __esModule: true,
    default: Editor,
    useMonaco: () => ({})
  };
});

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: any, _opts: any) => () => <div data-testid="dynamic-panel">TypeGraphPanel</div>
}));

vi.mock('@codesandbox/sandpack-react', () => ({
  __esModule: true,
  Sandpack: ({ children }: any) => <div data-testid="sandpack">{children}</div>
}));

vi.mock('framer-motion', () => ({
  __esModule: true,
  motion: {
    div: 'div'
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

vi.mock('@/lib/engine', () => {
  const runEngine = vi.fn((_json: any, lang: string) => `// Generated ${lang}`);
  return {
    __esModule: true,
    runEngine,
    parseYAML: vi.fn(),
    parseXML: vi.fn(),
    parseCurl: vi.fn(),
    curlToTypeScript: vi.fn(),
    parseSQLToZod: vi.fn(),
    getDecisions: vi.fn(() => []),
  };
});

vi.mock('@/lib/diff', () => ({
  __esModule: true,
  compareSchemas: vi.fn(() => [])
}));

vi.mock('@/lib/analytics', () => ({
  __esModule: true,
  trackWorkbenchOpen: vi.fn(),
  trackConvertSuccess: vi.fn(),
  trackProClick: vi.fn(),
  shouldReportConvert: vi.fn(() => true),
  trackInferenceError: vi.fn(),
}));

vi.mock('@/lib/privacy', () => ({
  __esModule: true,
  processPii: vi.fn(() => ({ detectedTypes: [], maskedText: '' }))
}));

vi.mock('@/lib/supabase', () => ({
  __esModule: true,
  supabase: undefined
}));

import { Workbench } from '../Workbench';

const renderWorkbench = (outputTab = 'typescript', setOutputTab = () => {}) =>
  render(
    <Workbench
      slug="json-to-typescript"
      isDark={false}
      geminiKey=""
      outputTab={outputTab}
      setOutputTab={setOutputTab}
      user={null}
    />
  );

const renderWorkbenchWithState = () => {
  const Wrapper = () => {
    const [outputTab, setOutputTab] = useState('typescript');
    return (
      <Workbench
        slug="json-to-typescript"
        isDark={false}
        geminiKey=""
        outputTab={outputTab}
        setOutputTab={setOutputTab}
        user={null}
      />
    );
  };

  return render(<Wrapper />);
}

describe('Workbench integration', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    const engine = await import('@/lib/engine');
    const mockedEngine = vi.mocked(engine);
    mockedEngine.runEngine.mockImplementation((_json: any, lang: string) => `// Generated ${lang}`);
  });

  test('renders input and output editors', () => {
    renderWorkbench();
    expect(screen.getByTestId('input-editor')).toBeDefined();
    expect(screen.getByTestId('output-editor')).toBeDefined();
  });

  test('shows generated output when valid JSON is entered', async () => {
    renderWorkbench();

    const inputEditor = screen.getByTestId('input-editor') as HTMLTextAreaElement;
    const outputEditor = screen.getByTestId('output-editor') as HTMLTextAreaElement;

    fireEvent.change(inputEditor, { target: { value: '{"foo":"bar"}' } });

    await waitFor(() => expect(outputEditor.value).toBe('// Generated typescript'));
  });

  test('shows parse error state for invalid JSON', async () => {
    renderWorkbench();

    const inputEditor = screen.getByTestId('input-editor') as HTMLTextAreaElement;
    fireEvent.change(inputEditor, { target: { value: '{invalid json' } });

    await waitFor(() => expect(screen.getByText('Heal Schema')).toBeDefined());
  });

  test('switches output tabs and renders new generated output', async () => {
    renderWorkbenchWithState();

    const inputEditor = screen.getByTestId('input-editor') as HTMLTextAreaElement;
    fireEvent.change(inputEditor, { target: { value: '{"foo":"bar"}' } });

    const zodTab = await screen.findByText('Zod');
    fireEvent.click(zodTab);

    const outputEditor = screen.getByTestId('output-editor') as HTMLTextAreaElement;
    await waitFor(() => expect(outputEditor.value).toBe('// Generated zod'));
  });

  test('shows unsupported output message when target is not supported', async () => {
    const engine = await import('@/lib/engine');
    const mockedEngine = vi.mocked(engine);
    mockedEngine.runEngine.mockImplementation((_json: any, lang: string) =>
      lang === 'graphql' ? '// Unsupported output target: "graphql"' : `// Generated ${lang}`
    );

    renderWorkbenchWithState();

    const inputEditor = screen.getByTestId('input-editor') as HTMLTextAreaElement;
    fireEvent.change(inputEditor, { target: { value: '{"foo":"bar"}' } });

    const gqlTab = await screen.findByText('GQL');
    fireEvent.click(gqlTab);

    const outputEditor = screen.getByTestId('output-editor') as HTMLTextAreaElement;
    await waitFor(() => expect(outputEditor.value).toContain('Unsupported output target'));
  });
});
