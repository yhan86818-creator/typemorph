'use client';
import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { inferSchema, runEngine } from '@/lib/engine';
import { schemaToAST } from '@/lib/ast';
import { compareSchemaTypes } from '@/lib/diff';
import { analyzeImpact, analyzeLanguageImpact } from '@/lib/impact';
import type { Schema } from '@/lib/types';
import type { ImpactKind, ImpactResult, LanguageImpact } from '@/lib/impact';

const TypeGraphPanel = dynamic(() => import('./TypeGraphPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">
      Loading graph…
    </div>
  ),
});

interface Props {
  afterJsonData: unknown;
  afterSchema: Schema | null;
  afterTsCode: string;
  isDark: boolean;
}

interface AnalysisResult {
  impact: ImpactResult;
  langImpact: LanguageImpact[];
  highlights: Map<string, ImpactKind>;
  diffs: ReturnType<typeof compareSchemaTypes>;
}

const SEVERITY_COLOR: Record<string, string> = {
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-slate-500 dark:text-slate-400',
};

export default function ImpactView({ afterJsonData, afterSchema, afterTsCode, isDark }: Props) {
  const [beforeText, setBeforeText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(() => {
    setError(null);
    setResult(null);

    if (!afterSchema) {
      setError('No schema loaded. Paste a JSON on the left side of the workbench first.');
      return;
    }

    let beforeJson: unknown;
    try {
      beforeJson = JSON.parse(beforeText);
    } catch {
      setError('Could not parse "Before" — must be valid JSON.');
      return;
    }

    try {
      const beforeSchema = inferSchema(beforeJson);
      const diffs = compareSchemaTypes(beforeSchema, afterSchema, 'root');
      const classes = schemaToAST(afterSchema, 'Root');
      const impact = analyzeImpact(diffs, classes, 'Root');
      const langImpact = analyzeLanguageImpact(beforeJson, afterJsonData);

      const highlights = new Map<string, ImpactKind>(
        Array.from(impact.classImpact.entries())
      );

      setResult({ impact, langImpact, highlights, diffs });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    }
  }, [beforeText, afterSchema, afterJsonData]);

  const affectedLangs = result?.langImpact.filter(l => l.affected) ?? [];
  const totalLangs = result?.langImpact.length ?? 0;

  return (
    <div className="w-full min-h-full flex flex-col px-6 py-6 gap-6 bg-white dark:bg-[#0A0A0A]">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-mono uppercase tracking-widest font-bold mb-3 border border-slate-200 dark:border-white/10">
          Impact Propagation
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
          Schema Change Impact
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Paste the previous JSON below. TypeMorph will show which classes and output languages are affected.
        </p>
      </div>

      {/* Input row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
            Before (JSON)
          </label>
          <textarea
            value={beforeText}
            onChange={e => setBeforeText(e.target.value)}
            placeholder={'{\n  "user_id": "abc",\n  "name": "Alice"\n}'}
            spellCheck={false}
            className="h-40 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[12px] font-mono text-slate-800 dark:text-slate-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
            After (current workbench input)
          </label>
          <div className="h-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-[12px] font-mono text-slate-500 dark:text-slate-400 p-3 overflow-hidden">
            {afterSchema ? (
              <span className="text-slate-400 dark:text-slate-500">
                {afterTsCode
                  ? afterTsCode.split('\n').slice(0, 8).join('\n') + (afterTsCode.split('\n').length > 8 ? '\n…' : '')
                  : '(schema loaded)'}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic">No schema — paste JSON in the workbench</span>
            )}
          </div>
        </div>
      </div>

      {/* Analyze button */}
      <div className="flex items-center gap-3">
        <button
          onClick={analyze}
          disabled={!beforeText.trim() || !afterSchema}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-mono font-bold uppercase tracking-widest hover:bg-slate-700 dark:hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Analyze Impact
        </button>
        {result && result.impact.totalChanged === 0 && (
          <span className="text-[11px] font-mono text-slate-400">No changes detected between these two schemas.</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-[12px] font-mono text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (result.impact.totalChanged > 0 || result.diffs.length > 0) && (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-4 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-mono">
            <span>
              <span className="font-bold text-red-600 dark:text-red-400">{result.impact.totalChanged}</span>
              <span className="text-slate-500 dark:text-slate-400"> changed</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>
              <span className="font-bold text-orange-600 dark:text-orange-400">{result.impact.totalImpacted}</span>
              <span className="text-slate-500 dark:text-slate-400"> impacted</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>
              <span className="font-bold text-slate-600 dark:text-slate-400">{result.impact.totalSafe}</span>
              <span className="text-slate-500 dark:text-slate-400"> safe</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span>
              <span className="font-bold text-slate-900 dark:text-white">{affectedLangs.length}</span>
              <span className="text-slate-500 dark:text-slate-400"> of {totalLangs} output targets need regeneration</span>
            </span>
          </div>

          {/* Graph */}
          <div className="h-[360px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <TypeGraphPanel
              tsCode={afterTsCode}
              isDark={isDark}
              highlights={result.highlights}
            />
          </div>

          {/* Changed field details */}
          {result.impact.changedFields.size > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
                Changed fields
              </h3>
              <div className="flex flex-col gap-2">
                {Array.from(result.impact.changedFields.entries()).map(([className, diffs]) => (
                  <div key={className} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30">
                      <span className="text-[11px] font-mono font-bold text-red-700 dark:text-red-400">{className}</span>
                    </div>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {diffs.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 px-3 py-2">
                          <span className={`text-[9px] font-mono font-bold uppercase mt-0.5 ${SEVERITY_COLOR[d.severity]}`}>
                            {d.severity}
                          </span>
                          <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                            {d.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Language impact grid */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
              Output targets
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {result.langImpact.map(({ target, label, affected }) => (
                <div
                  key={target}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-colors ${
                    affected
                      ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${affected ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
