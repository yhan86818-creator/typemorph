'use client';

import React, { useState, useEffect } from 'react';
import { inferSchema } from '@/lib/engine';
import { compareSchemaTypes, type SchemaDiff } from '@/lib/diff';

const STORAGE_KEY = 'typemorph-drift-baseline';

const SAMPLE = `{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00Z"
}`;

function parseJSON(text: string): { ok: true; obj: unknown } | { ok: false; error: string } {
  try { return { ok: true, obj: JSON.parse(text.trim()) }; }
  catch (e: any) { return { ok: false, error: e.message }; }
}

function SeverityIcon({ severity }: { severity: SchemaDiff['severity'] }) {
  if (severity === 'error')   return <span className="text-red-500 font-mono text-xs">✖</span>;
  if (severity === 'warning') return <span className="text-amber-500 font-mono text-xs">⚠</span>;
  return <span className="text-slate-400 font-mono text-xs">ℹ</span>;
}

type Mode = 'idle' | 'baseline-saved' | 'result';

export default function DriftCheckClient() {
  const [current, setCurrent] = useState(SAMPLE);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [result, setResult] = useState<{ diffs: SchemaDiff[]; breaking: number; warnings: number; info: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { setBaseline(stored); setMode('baseline-saved'); }
  }, []);

  function saveBaseline() {
    const p = parseJSON(current);
    if (!p.ok) { setParseError(p.error); return; }
    setParseError(null);
    localStorage.setItem(STORAGE_KEY, current);
    setBaseline(current);
    setResult(null);
    setMode('baseline-saved');
  }

  function checkDrift() {
    if (!baseline) return;
    const pc = parseJSON(current);
    const pb = parseJSON(baseline);
    if (!pc.ok) { setParseError(pc.error); return; }
    if (!pb.ok || !pc.ok) return;
    setParseError(null);

    const schemaA = inferSchema(pb.obj);
    const schemaB = inferSchema(pc.obj);
    const rawDiffs = compareSchemaTypes(schemaA, schemaB);
    // Downgrade enum_changed errors to warnings (single-sample baseline limitation)
    const diffs = rawDiffs.map(d =>
      d.type === 'enum_changed' && d.severity === 'error'
        ? { ...d, severity: 'warning' as const, description: d.description + ' (verify: inferred from single sample)' }
        : d
    );
    const breaking = diffs.filter(d => d.severity === 'error').length;
    const warnings = diffs.filter(d => d.severity === 'warning').length;
    const info     = diffs.filter(d => d.severity === 'info').length;
    setResult({ diffs, breaking, warnings, info });
    setMode('result');
  }

  function clearBaseline() {
    localStorage.removeItem(STORAGE_KEY);
    setBaseline(null);
    setResult(null);
    setMode('idle');
  }

  const statusColor = result
    ? result.breaking > 0 ? 'text-red-500' : result.warnings > 0 ? 'text-amber-500' : 'text-green-500'
    : '';

  const statusText = result
    ? result.breaking > 0
      ? `✖ ${result.breaking} breaking change${result.breaking === 1 ? '' : 's'} detected`
      : result.diffs.length === 0
        ? '✓ No drift — schema matches baseline'
        : `⚠ ${result.warnings} warning${result.warnings === 1 ? '' : 's'} (no breaking changes)`
    : null;

  return (
    <div className="space-y-5">
      {/* Baseline status */}
      {mode !== 'idle' && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 text-xs font-mono">✓</span>
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">Baseline saved in browser</span>
          </div>
          <button
            onClick={clearBaseline}
            className="text-[11px] text-green-600 dark:text-green-400 hover:text-red-500 transition-colors font-mono"
          >
            clear
          </button>
        </div>
      )}

      {/* Input */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
          {mode === 'idle' ? 'Step 1 — Paste your known-good API response' : 'Current API response'}
        </label>
        <textarea
          value={current}
          onChange={e => { setCurrent(e.target.value); setResult(null); }}
          spellCheck={false}
          rows={12}
          className={`w-full font-mono text-[12.5px] leading-relaxed rounded-xl border p-4 resize-none bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 outline-none transition-colors ${
            parseError
              ? 'border-red-400 dark:border-red-500'
              : 'border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/30'
          }`}
          placeholder="Paste JSON response here..."
        />
        {parseError && <p className="mt-1 text-xs text-red-500 font-mono">{parseError}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {mode === 'idle' ? (
          <button
            onClick={saveBaseline}
            className="px-6 py-2.5 rounded-xl text-sm font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 transition-opacity"
          >
            Save as baseline →
          </button>
        ) : (
          <>
            <button
              onClick={checkDrift}
              className="px-6 py-2.5 rounded-xl text-sm font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 transition-opacity"
            >
              Check drift →
            </button>
            <button
              onClick={saveBaseline}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Update baseline
            </button>
          </>
        )}
        {statusText && (
          <span className={`text-sm font-bold ${statusColor}`}>{statusText}</span>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          {result.diffs.length === 0 ? (
            <div className="p-6 text-center text-green-600 dark:text-green-400 font-bold">
              ✓ No drift detected — response matches baseline schema.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {result.diffs.map((d, i) => (
                <div key={i} className="flex gap-4 px-5 py-3.5 items-start hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <SeverityIcon severity={d.severity} />
                  <div className="min-w-0">
                    {d.path && (
                      <code className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">
                        {d.path}
                      </code>
                    )}
                    <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-snug">
                      {d.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] flex gap-5 text-[11px] font-mono text-slate-500">
            <span className={result.breaking > 0 ? 'text-red-500' : ''}>{result.breaking} breaking</span>
            <span className={result.warnings > 0 ? 'text-amber-500' : ''}>{result.warnings} warnings</span>
            <span>{result.info} info</span>
          </div>
        </div>
      )}
    </div>
  );
}
