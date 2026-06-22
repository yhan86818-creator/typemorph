'use client';
import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Wand2 } from 'lucide-react';
import { parseZodToSchema } from '@/lib/parsers';
import { runEngine } from '@/lib/engine';
import { validateOutputs, type ValidationReport, type OutputIssue } from '@/lib/validate';
import type { Schema } from '@/lib/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const SAMPLE_SCHEMA = `import { z } from "zod";

export const answerSchema = z.object({
  id: z.string().uuid(),
  confidence: z.number(),
  sources: z.array(z.string()),
  status: z.enum(["ok", "partial"]),
});`;

const SAMPLE_OUTPUTS = `{"id":"550e8400-e29b-41d4-a716-446655440000","confidence":0.9,"sources":["a","b"],"status":"ok"}
{"id":"550e8400-e29b-41d4-a716-446655440000","confidence":"0.8","sources":["x"],"status":"ok"}
{"id":"not-a-uuid","confidence":0.5,"status":"deferred","reasoning":"because"}`;

function useTheme() {
  if (typeof window === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Parse outputs as a JSON array, a single JSON object, or JSONL (one object per line). */
function parseRecords(text: string): { records: unknown[]; error?: string } {
  const t = text.trim();
  if (!t) return { records: [] };
  try {
    const v = JSON.parse(t);
    return { records: Array.isArray(v) ? v : [v] };
  } catch { /* fall through to JSONL */ }
  const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
  const records: unknown[] = [];
  for (let i = 0; i < lines.length; i++) {
    try { records.push(JSON.parse(lines[i])); }
    catch { return { records: [], error: `Line ${i + 1} is not valid JSON` }; }
  }
  return { records };
}

export function ValidateOutputView() {
  const [schemaText, setSchemaText] = useState(SAMPLE_SCHEMA);
  const [outputsText, setOutputsText] = useState(SAMPLE_OUTPUTS);
  const [strict, setStrict] = useState(false);
  const theme = useTheme();

  const { records, parseError } = useMemo(() => {
    const { records, error } = parseRecords(outputsText);
    return { records, parseError: error };
  }, [outputsText]);

  const { expected, schemaError } = useMemo(() => {
    const st = schemaText.trim();
    if (!st) return { expected: null as Schema | null, schemaError: undefined as string | undefined };
    const parsed = parseZodToSchema(schemaText);
    return { expected: parsed, schemaError: parsed ? undefined : 'Could not parse a Zod schema from this input.' };
  }, [schemaText]);

  const report: ValidationReport | null = useMemo(() => {
    if (!expected || records.length === 0) return null;
    try { return validateOutputs(expected, records, { strict }); }
    catch { return null; }
  }, [expected, records, strict]);

  const handleInfer = useCallback(() => {
    const { records, error } = parseRecords(outputsText);
    if (error || records.length === 0) return;
    try {
      const zod = runEngine(records, 'zod', '', { rootName: 'Output', samplesMode: true });
      if (zod) setSchemaText(zod);
    } catch { /* ignore */ }
  }, [outputsText]);

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
            LLM Output Validator
          </span>
          {report && (
            <span className="text-[10px] font-mono">
              <span className="text-emerald-500">{report.passed} pass</span>
              <span className="text-slate-400"> / </span>
              <span className={report.failed > 0 ? 'text-red-500' : 'text-slate-400'}>{report.failed} fail</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={strict} onChange={e => setStrict(e.target.checked)} className="accent-slate-900 dark:accent-white" />
            Strict
          </label>
          <button
            onClick={handleInfer}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Infer a Zod schema from the outputs below"
          >
            <Wand2 size={10} /> Infer schema
          </button>
        </div>
      </div>

      {/* Body: left = two stacked editors, right = report */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">

        {/* Left column: schema + outputs */}
        <div className="flex flex-col border-r border-slate-200 dark:border-white/10 min-h-0">
          <div className="flex flex-col min-h-0 flex-1 border-b border-slate-200 dark:border-white/10">
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 shrink-0 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expected Zod schema</span>
              {schemaError && <span className="text-[9px] font-mono text-amber-500">{schemaError}</span>}
            </div>
            <div className="flex-1 min-h-0">
              <MonacoEditor height="100%" language="typescript" theme={monacoTheme} value={schemaText} onChange={v => setSchemaText(v ?? '')} options={monacoOpts} />
            </div>
          </div>
          <div className="flex flex-col min-h-0 flex-1">
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 shrink-0 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">LLM outputs — JSON array or JSONL</span>
              {parseError && <span className="text-[9px] font-mono text-amber-500">{parseError}</span>}
            </div>
            <div className="flex-1 min-h-0">
              <MonacoEditor height="100%" language="json" theme={monacoTheme} value={outputsText} onChange={v => setOutputsText(v ?? '')} options={monacoOpts} />
            </div>
          </div>
        </div>

        {/* Right column: report */}
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Report</span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-4 text-[12px] font-mono text-slate-700 dark:text-slate-300">
            <ReportBody report={report} expected={expected} recordCount={records.length} />
          </div>
        </div>

      </div>
    </div>
  );
}

function ReportBody({ report, expected, recordCount }: { report: ValidationReport | null; expected: Schema | null; recordCount: number }) {
  if (!expected) return <p className="text-slate-400">Paste a Zod schema above, or click <span className="font-bold">Infer schema</span> to generate one from your outputs.</p>;
  if (recordCount === 0) return <p className="text-slate-400">Paste one or more LLM outputs (a JSON array, a single object, or JSONL).</p>;
  if (!report) return <p className="text-slate-400">Waiting for valid input…</p>;

  const byRecord = new Map<number, OutputIssue[]>();
  for (const it of report.issues) {
    if (!byRecord.has(it.recordIndex)) byRecord.set(it.recordIndex, []);
    byRecord.get(it.recordIndex)!.push(it);
  }
  const ordered = [...byRecord.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-emerald-500 font-bold">✓ {report.passed} passed</span>
        <span className={report.failed > 0 ? 'text-red-500 font-bold' : 'text-slate-400'}>✗ {report.failed} failed</span>
        <span className="text-slate-400">of {report.total}</span>
      </div>

      {report.ok ? (
        <p className="text-emerald-500">All outputs conform to the schema.</p>
      ) : (
        ordered.map(([idx, issues]) => {
          const hasError = issues.some(i => i.severity === 'error');
          return (
            <div key={idx} className="border-l-2 pl-3 border-slate-200 dark:border-white/10">
              <div className={hasError ? 'text-red-500 font-bold' : 'text-amber-500 font-bold'}>
                {hasError ? '✗' : '⚠'} output #{idx}
              </div>
              {issues.map((it, i) => (
                <div key={i} className="mt-0.5">
                  <span className={it.severity === 'error' ? 'text-red-500' : 'text-amber-500'}>{it.message}</span>
                  {it.fix && <div className="text-slate-400 pl-3">→ {it.fix}</div>}
                </div>
              ))}
            </div>
          );
        })
      )}

      {report.summary.length > 0 && (
        <div className="pt-2 text-slate-400 border-t border-slate-200 dark:border-white/10">
          {report.summary.map(s => `${s.label} ×${s.count}`).join('  ·  ')}
        </div>
      )}
    </div>
  );
}
