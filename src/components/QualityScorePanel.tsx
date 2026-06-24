'use client';

import React, { useMemo, useState } from 'react';
import { Schema } from '@/lib/types';
import { analyzeQuality, QualityResult } from '@/lib/quality';

interface Props {
  schema: Schema | null;
}

// Subtle severity tint on the hint dots — calm, not loud.
const SEVERITY_DOT: Record<string, string> = {
  error: 'rgba(248,113,113,0.9)',
  warning: 'rgba(251,191,36,0.9)',
  info: 'rgba(255,255,255,0.4)',
};

export default function QualityScorePanel({ schema }: Props) {
  const [open, setOpen] = useState(false);

  const result = useMemo<QualityResult | null>(() => {
    if (!schema) return null;
    try { return analyzeQuality(schema); } catch { return null; }
  }, [schema]);

  if (!result) return null;
  if (result.stats.totalFields === 0) return null;

  const { score, grade } = result;
  const clamped = Math.max(0, Math.min(100, score));
  const r = 27;
  const circ = 2 * Math.PI * r; // ≈ 169.6
  const offset = circ * (1 - clamped / 100);
  const filledSegs = Math.round(clamped / 10);
  const hintCount = result.issues.length;

  return (
    <div className="rounded-lg" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid #21262d', padding: '13px 14px 12px' }}>
      {/* header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span className="text-[10px] uppercase font-semibold" style={{ color: '#6e7681', letterSpacing: '0.1em' }}>Schema Quality</span>
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 text-[11px] hover:opacity-80 transition-opacity" style={{ color: '#6e7681' }}>
          {open ? 'Hide hints' : `${hintCount} hint${hintCount !== 1 ? 's' : ''}`}
          <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}><path d="M5 7L1 3h8L5 7z" /></svg>
        </button>
      </div>

      {/* ring + grade + breakdown */}
      <div className="flex items-center" style={{ gap: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64, flex: 'none' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r={r} stroke="#21262d" strokeWidth="4.5" fill="none" />
            <circle cx="32" cy="32" r={r} stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.56,0.64,1)', opacity: 0.9 }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0 }} className="flex flex-col items-center justify-center">
            <span className="font-bold" style={{ fontSize: 18, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 9, color: '#6e7681', marginTop: 2 }}>/ 100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2" style={{ marginBottom: 8 }}>
            <span className="font-bold" style={{ fontSize: 26, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{grade}</span>
            <span style={{ fontSize: 11, color: '#8b949e' }}>{hintCount} hint{hintCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex" style={{ gap: 5 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < filledSegs ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* hints (collapsed by default) */}
      {open && hintCount > 0 && (
        <div className="flex flex-col" style={{ marginTop: 12, gap: 6 }}>
          {result.issues.slice(0, 5).map((issue, i) => (
            <div key={i} className="flex items-start gap-2" style={{ padding: '7px 9px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5 }}>
              <span style={{ flex: 'none', width: 4, height: 4, borderRadius: '50%', background: SEVERITY_DOT[issue.severity] || 'rgba(255,255,255,0.4)', marginTop: 6 }} />
              <span style={{ fontSize: 11.5, lineHeight: 1.5, color: '#8b949e' }}>
                {issue.path && <span className="font-mono" style={{ opacity: 0.6, marginRight: 4 }}>{issue.path}:</span>}
                {issue.message}
              </span>
            </div>
          ))}
          {hintCount > 5 && (
            <div style={{ fontSize: 10, color: '#6e7681', paddingLeft: 4 }}>+{hintCount - 5} more</div>
          )}
        </div>
      )}
      {open && hintCount === 0 && (
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 12 }}>No issues found — schema looks good.</p>
      )}
    </div>
  );
}
