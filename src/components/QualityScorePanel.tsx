'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Schema } from '@/lib/types';
import { analyzeQuality, QualityResult } from '@/lib/quality';

interface Props {
  schema: Schema | null;
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-600 dark:text-emerald-400',
  B: 'text-blue-600 dark:text-blue-400',
  C: 'text-amber-600 dark:text-amber-400',
  D: 'text-orange-600 dark:text-orange-400',
  F: 'text-red-600 dark:text-red-400',
};

const GRADE_PILL: Record<string, string> = {
  A: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  B: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  C: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  D: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  F: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const GRADE_BG: Record<string, string> = {
  A: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40',
  B: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40',
  C: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40',
  D: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40',
  F: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40',
};

const SEVERITY_COLORS: Record<string, string> = {
  error: 'text-red-700 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-slate-600 dark:text-slate-300',
};

const SEVERITY_DOT: Record<string, string> = {
  error: 'bg-red-500',
  warning: 'bg-amber-400',
  info: 'bg-slate-400 dark:bg-slate-500',
};

function ScoreArc({ score, grade }: { score: number; grade: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const dash = `${filled} ${circ - filled}`;
  const offset = circ * 0.25;

  return (
    <svg width="56" height="56" className="flex-shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="5"
        className="text-slate-100 dark:text-slate-800" />
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5"
        stroke="currentColor"
        strokeDasharray={dash}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={score >= 75 ? 'text-emerald-500' : score >= 60 ? 'text-amber-400' : 'text-red-500'}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="bold"
        fill="currentColor"
        className={GRADE_COLORS[grade]}>{score}</text>
    </svg>
  );
}

export default function QualityScorePanel({ schema }: Props) {
  const [open, setOpen] = useState(false);

  const result = useMemo<QualityResult | null>(() => {
    if (!schema) return null;
    try { return analyzeQuality(schema); } catch { return null; }
  }, [schema]);

  if (!result) return null;
  if (result.stats.totalFields === 0) return null;

  const hasIssues = result.issues.length > 0;

  return (
    <div className={`rounded-xl border transition-all ${open ? GRADE_BG[result.grade] : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50'}`}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
      >
        <ScoreArc score={result.score} grade={result.grade} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              Schema Quality
            </span>
            <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-md ${GRADE_PILL[result.grade]}`}>
              {result.grade}
            </span>
            {hasIssues && !open && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {result.issues.length} hint{result.issues.length > 1 ? 's' : ''}
              </span>
            )}
            {!hasIssues && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Clean</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-3 pb-3 border-t border-current/10 pt-2 animate-fade-in">
          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-2">
            <span>{result.stats.totalFields} fields</span>
            {result.stats.anyFields > 0 && (
              <span className="text-amber-600 dark:text-amber-400">{result.stats.anyFields} any</span>
            )}
            <span>depth {result.stats.maxDepth}</span>
            <span>{result.stats.namingStyle}</span>
            {result.stats.requiredFields > 0 && (
              <span>{result.stats.requiredFields} required / {result.stats.optionalFields} optional</span>
            )}
          </div>

          {result.issues.length > 0 ? (
            <ul className="space-y-1">
              {result.issues.slice(0, 5).map((issue, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[issue.severity]}`} />
                  <span className={SEVERITY_COLORS[issue.severity]}>
                    {issue.path && <span className="font-mono opacity-60 mr-1">{issue.path}:</span>}
                    {issue.message}
                  </span>
                </li>
              ))}
              {result.issues.length > 5 && (
                <li className="text-[10px] text-slate-400 pl-3">
                  +{result.issues.length - 5} more
                </li>
              )}
            </ul>
          ) : (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              No issues found — schema looks good.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
