'use client';
import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { tsToZod, TS_TO_ZOD_SAMPLE } from '@/lib/ts-to-zod';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

function useTheme() {
  if (typeof window === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function TsToZodView() {
  const [input, setInput] = useState(TS_TO_ZOD_SAMPLE);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();

  const result = tsToZod(input);

  const handleCopy = useCallback(() => {
    if (!result.output) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [result.output]);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';
  const monacoOpts = {
    fontSize: 12,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
    padding: { top: 12, bottom: 12 },
    renderLineHighlight: 'none' as const,
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
            TypeScript → Zod
          </span>
          {result.schemaCount > 0 && (
            <span className="text-[10px] font-mono text-slate-400">
              {result.schemaCount} schema{result.schemaCount !== 1 ? 's' : ''} generated
            </span>
          )}
          {result.error && (
            <span className="text-[10px] font-mono text-amber-500 truncate max-w-xs">
              {result.error.split('\n')[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInput(TS_TO_ZOD_SAMPLE)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw size={10} /> Reset
          </button>
          <button
            onClick={handleCopy}
            disabled={!result.output}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 transition-opacity disabled:opacity-30"
          >
            {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy Zod</>}
          </button>
        </div>
      </div>

      {/* Editors */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">

        {/* Input: TypeScript */}
        <div className="flex flex-col border-r border-slate-200 dark:border-white/10 min-h-0">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">TypeScript Input</span>
          </div>
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language="typescript"
              theme={monacoTheme}
              value={input}
              onChange={v => setInput(v ?? '')}
              options={monacoOpts}
            />
          </div>
        </div>

        {/* Output: Zod */}
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Zod Output</span>
          </div>
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language="typescript"
              theme={monacoTheme}
              value={result.error && !result.output ? `// ${result.error}` : result.output}
              options={{ ...monacoOpts, readOnly: true }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
