'use client';

import React, { useState } from 'react';
import { inferSchema } from '@/lib/engine';
import { compareSchemaTypes, type SchemaDiff } from '@/lib/diff';

const SAMPLE_A = `{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00Z"
}`;

const SAMPLE_B = `{
  "id": "usr_abc123",
  "name": "Bob",
  "role": "user",
  "updatedAt": "2024-06-01T00:00:00Z"
}`;

function parseJSON(text: string): { ok: true; obj: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, obj: JSON.parse(text.trim()) };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function SeverityIcon({ severity }: { severity: SchemaDiff['severity'] }) {
  if (severity === 'error')   return <span className="text-red-500 font-mono text-xs">✖</span>;
  if (severity === 'warning') return <span className="text-amber-500 font-mono text-xs">⚠</span>;
  return <span className="text-slate-400 font-mono text-xs">ℹ</span>;
}

export default function EnvDiffClient() {
  const [a, setA] = useState(SAMPLE_A);
  const [b, setB] = useState(SAMPLE_B);
  const [result, setResult] = useState<{ diffs: SchemaDiff[]; breaking: number; warnings: number; info: number } | null>(null);
  const [errors, setErrors] = useState<{ a?: string; b?: string }>({});

  function compare() {
    const pa = parseJSON(a);
    const pb = parseJSON(b);
    const newErrors: { a?: string; b?: string } = {};
    if (!pa.ok) newErrors.a = pa.error;
    if (!pb.ok) newErrors.b = pb.error;
    if (Object.keys(newErrors).length) { setErrors(newErrors); setResult(null); return; }
    setErrors({});
    if (!pa.ok || !pb.ok) return;

    const schemaA = inferSchema(pa.obj);
    const schemaB = inferSchema(pb.obj);
    const diffs = compareSchemaTypes(schemaA, schemaB);
    const breaking = diffs.filter(d => d.severity === 'error').length;
    const warnings = diffs.filter(d => d.severity === 'warning').length;
    const info     = diffs.filter(d => d.severity === 'info').length;
    setResult({ diffs, breaking, warnings, info });
  }

  const statusColor = result
    ? result.breaking > 0 ? 'text-red-500' : result.warnings > 0 ? 'text-amber-500' : 'text-green-500'
    : 'text-slate-400';

  const statusText = result
    ? result.breaking > 0
      ? `✖ ${result.breaking} breaking change${result.breaking === 1 ? '' : 's'}`
      : result.diffs.length === 0
        ? '✓ Schemas match'
        : `⚠ ${result.warnings} warning${result.warnings === 1 ? '' : 's'}`
    : null;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['a', 'b'] as const).map((side) => (
          <div key={side}>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Environment {side.toUpperCase()}
            </label>
            <textarea
              value={side === 'a' ? a : b}
              onChange={e => side === 'a' ? setA(e.target.value) : setB(e.target.value)}
              spellCheck={false}
              rows={12}
              className={`w-full font-mono text-[12.5px] leading-relaxed rounded-xl border p-4 resize-none bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 outline-none transition-colors ${
                errors[side]
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/30'
              }`}
              placeholder="Paste JSON response..."
            />
            {errors[side] && (
              <p className="mt-1 text-xs text-red-500 font-mono">{errors[side]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Compare button */}
      <div className="flex items-center gap-4">
        <button
          onClick={compare}
          className="px-6 py-2.5 rounded-xl text-sm font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 transition-opacity"
        >
          Compare →
        </button>
        {statusText && (
          <span className={`text-sm font-bold ${statusColor}`}>{statusText}</span>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          {result.diffs.length === 0 ? (
            <div className="p-6 text-center text-green-600 dark:text-green-400 font-bold">
              ✓ No differences detected — schemas match.
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
