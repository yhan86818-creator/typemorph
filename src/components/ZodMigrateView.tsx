'use client';
import React, { useState, useCallback } from 'react';
import { Copy, Check, ArrowRight, AlertTriangle, Zap } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { migrateZodV3ToV4, ZOD_V4_SUMMARY, type MigrationResult } from '@/lib/zod-migrate';

const SAMPLE_V3 = `import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  website: z.string().url().optional(),
  avatar: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  birthDate: z.string().date().optional(),
  sessionToken: z.string().jwt(),
  apiKey: z.string().uuid(),
  encodedData: z.string().base64().optional(),
});

const EventSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime().optional(),
  duration: z.string().duration().optional(),
});
`;

export function ZodMigrateView({ isDark }: { isDark: boolean }) {
  const [input, setInput] = useState(SAMPLE_V3);
  const [result, setResult] = useState<MigrationResult>(() => migrateZodV3ToV4(SAMPLE_V3));
  const [copied, setCopied] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const handleChange = useCallback((val: string | undefined) => {
    const v = val ?? '';
    setInput(v);
    setResult(migrateZodV3ToV4(v));
  }, []);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [result.output]);

  const monoEditorOpts = {
    minimap: { enabled: false },
    fontSize: 12,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },
    wordWrap: 'on' as const,
    scrollbar: { vertical: 'auto' as const, horizontal: 'auto' as const },
    renderLineHighlight: 'none' as const,
  };

  const hasChanges = result.changes.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#0A0A0A] overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-slate-200 dark:border-[#1A1A1A]">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 text-[10px] font-mono uppercase tracking-widest font-bold mb-2 border border-violet-200 dark:border-violet-500/20">
              <Zap size={10} />
              Zod v3 → v4 Migration
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Migrate Zod Schemas to v4
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paste your Zod v3 code. All format validators are updated to v4 syntax automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCheatsheet(s => !s)}
              className="text-[10px] font-mono uppercase px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 transition-all"
            >
              {showCheatsheet ? 'Hide' : 'Cheatsheet'}
            </button>
            <button
              onClick={copy}
              disabled={!result.output.trim()}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 transition-all disabled:opacity-40"
            >
              {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy v4'}
            </button>
          </div>
        </div>

        {/* Cheatsheet */}
        {showCheatsheet && (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {ZOD_V4_SUMMARY.map(({ rule, becomes }) => (
              <div key={rule} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-red-500 dark:text-red-400">{rule}</span>
                <ArrowRight size={9} className="text-slate-400 flex-shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400">{becomes}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editors */}
      <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-slate-200 dark:divide-[#1A1A1A]">
        <div className="flex flex-col min-h-0">
          <div className="flex-none px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-[#1A1A1A]">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-500 tracking-wider">Zod v3 — input</span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="typescript"
              value={input}
              theme={isDark ? 'vs-dark' : 'light'}
              onChange={handleChange}
              options={{ ...monoEditorOpts, readOnly: false }}
            />
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex-none px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-[#1A1A1A] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-500 tracking-wider">Zod v4 — migrated</span>
            {hasChanges && (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {result.changes.length} change{result.changes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="typescript"
              value={result.output}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{ ...monoEditorOpts, readOnly: true }}
            />
          </div>
        </div>
      </div>

      {/* Changes panel */}
      {(hasChanges || hasWarnings) && (
        <div className="flex-none border-t border-slate-200 dark:border-[#1A1A1A] bg-slate-50 dark:bg-slate-900/40 max-h-36 overflow-y-auto">
          <div className="px-4 py-2 flex flex-col gap-1">
            {result.changes.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-slate-400 dark:text-slate-600 w-12 flex-shrink-0">L{c.line}</span>
                <span className="text-red-500 dark:text-red-400 line-through">{c.original}</span>
                <ArrowRight size={9} className="text-slate-400 flex-shrink-0" />
                <span className={c.isIso ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {c.migrated}
                </span>
              </div>
            ))}
            {result.warnings.map((w, i) => (
              <div key={`w${i}`} className="flex items-center gap-2 text-[10px] font-mono text-amber-600 dark:text-amber-400">
                <AlertTriangle size={10} className="flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasChanges && !hasWarnings && input.trim() && (
        <div className="flex-none border-t border-slate-200 dark:border-[#1A1A1A] px-4 py-2 bg-slate-50 dark:bg-slate-900/40">
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">
            No v3 → v4 changes needed — your schema is already v4 compatible.
          </span>
        </div>
      )}
    </div>
  );
}
