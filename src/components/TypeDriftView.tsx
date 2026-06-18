'use client';

import React, { useState, useCallback } from 'react';
import { Zap, AlertCircle, Info, TriangleAlert, CheckCircle2, Copy, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { compareSchemaTypes, SchemaDiff } from '@/lib/diff';
import { inferSchema } from '@/lib/engine';
import { parseTypeScriptToSchema } from '@/lib/parsers';

const SAMPLE_TS = `interface User {
  id: string;
  email: string;
  status: "active" | "pending";
  price: number;
  tags?: string[];
}`;

const SAMPLE_JSON = `{
  "id": 1,
  "email": "alice@example.com",
  "status": "cancelled",
  "price": "29.99",
  "createdAt": "2024-01-15"
}`;

function matchScore(diffs: SchemaDiff[]): number {
  if (diffs.length === 0) return 100;
  const breaking = diffs.filter(d => d.severity === 'error').length;
  const warnings = diffs.filter(d => d.severity === 'warning').length;
  return Math.max(0, 100 - breaking * 15 - warnings * 5);
}

function scoreColor(score: number) {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function TypeDriftView({ isDark }: { isDark: boolean }) {
  const [tsText, setTsText] = useState(SAMPLE_TS);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [result, setResult] = useState<{ diffs: SchemaDiff[] } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCheck = useCallback(() => {
    setError('');
    setResult(null);

    const tsSchema = parseTypeScriptToSchema(tsText.trim());
    if (!tsSchema) {
      setError('Could not parse TypeScript interface. Paste a valid interface or type definition.');
      return;
    }

    let jsonObj: any;
    try {
      jsonObj = JSON.parse(jsonText.trim());
    } catch {
      setError('Could not parse JSON. Make sure the API response is valid JSON.');
      return;
    }

    const apiSchema = inferSchema(jsonObj);
    const diffs = compareSchemaTypes(tsSchema, apiSchema);
    setResult({ diffs });
  }, [tsText, jsonText]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCheck();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCheck]);

  const breaking = result?.diffs.filter(d => d.severity === 'error') ?? [];
  const warnings = result?.diffs.filter(d => d.severity === 'warning') ?? [];
  const infos = result?.diffs.filter(d => d.severity === 'info') ?? [];
  const score = result ? matchScore(result.diffs) : null;

  const handleCopyReport = useCallback(() => {
    if (!result || score === null) return;
    const lines = [
      `# API Type Drift Report`,
      `Match Score: ${score}% (${breaking.length} mismatches, ${warnings.length} warnings, ${infos.length} info)`,
      '',
    ];
    if (breaking.length > 0) {
      lines.push('## Type Mismatches (Breaking)');
      breaking.forEach(d => lines.push(`- [${d.type}] ${d.path}: ${d.description}`));
      lines.push('');
    }
    if (warnings.length > 0) {
      lines.push('## Warnings');
      warnings.forEach(d => lines.push(`- [${d.type}] ${d.path}: ${d.description}`));
      lines.push('');
    }
    if (infos.length > 0) {
      lines.push('## Info');
      infos.forEach(d => lines.push(`- [${d.type}] ${d.path}: ${d.description}`));
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result, score, breaking, warnings, infos]);

  const severityIcon = (s: SchemaDiff['severity']) => {
    if (s === 'error') return <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />;
    if (s === 'warning') return <TriangleAlert size={13} className="text-yellow-500 shrink-0 mt-0.5" />;
    return <Info size={13} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />;
  };

  const severityBg = (s: SchemaDiff['severity']) => {
    if (s === 'error') return 'bg-[#0F0A0A] border-[#1E1E1E] border-l-[3px] border-l-red-500/80';
    if (s === 'warning') return 'bg-[#0F0D08] border-[#1E1E1E] border-l-[3px] border-l-amber-500/80';
    return 'bg-[#0F0F0F] border-[#1E1E1E] border-l-[3px] border-l-slate-600/60';
  };

  const typeBadge = (t: SchemaDiff['type'], severity: SchemaDiff['severity']) => {
    const redCls   = 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400';
    const amberCls = 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
    const slateCls = 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300';
    const severityCls = severity === 'error' ? redCls : severity === 'warning' ? amberCls : slateCls;
    const cls: Record<SchemaDiff['type'], string> = {
      removed: redCls, type_changed: redCls, renamed: amberCls,
      required_changed: severityCls, enum_changed: severityCls,
      nullable_changed: slateCls, format_changed: slateCls, added: slateCls,
    };
    const label: Record<SchemaDiff['type'], string> = {
      removed: 'missing', added: 'unknown', renamed: 'renamed', type_changed: 'type mismatch',
      required_changed: 'required', enum_changed: 'enum',
      format_changed: 'format', nullable_changed: 'nullable',
    };
    return (
      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${cls[t]}`}>
        {label[t]}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] overflow-hidden">

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-[#1A1A1A] shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#E8E8E8] flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400" />
            API Type Drift Detector
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-[#606060] mt-0.5">
            Paste your TypeScript types + real API response — detect runtime mismatches
          </p>
        </div>
        <button
          onClick={handleCheck}
          className="flex items-center gap-2 px-4 py-2 text-slate-900 dark:text-white text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title="Cmd+Enter or Ctrl+Enter"
        >
          <Zap size={12} className="text-amber-400" />
          Check Drift
          <span className="text-[9px] opacity-40 border border-current px-1 py-0.5 rounded">⌘↵</span>
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400 shrink-0">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* エディター2面 */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 px-4 pt-3">
        {/* 左: TypeScript型定義 */}
        <div className="flex flex-col border border-slate-200 dark:border-[#1A1A1A] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F]">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400 flex-1">Your TypeScript Types</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">interface / type</span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="typescript"
            value={tsText}
            onChange={v => setTsText(v || '')}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false }, fontSize: 12,
              scrollBeyondLastLine: false, padding: { top: 10, bottom: 10 },
              automaticLayout: true, wordWrap: 'on',
            }}
          />
        </div>

        {/* 右: 実APIレスポンス */}
        <div className="flex flex-col border border-slate-200 dark:border-[#1A1A1A] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F]">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400 flex-1">Real API Response</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">JSON</span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={jsonText}
            onChange={v => setJsonText(v || '')}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false }, fontSize: 12,
              scrollBeyondLastLine: false, padding: { top: 10, bottom: 10 },
              automaticLayout: true, wordWrap: 'on',
            }}
          />
        </div>
      </div>

      {/* 結果パネル */}
      <div className="px-4 py-3 shrink-0 max-h-[45%] overflow-y-auto">
        {result && (
          <>
            <div className="flex items-start gap-3 mb-3 flex-wrap">
              {result.diffs.length === 0 ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle2 size={14} /> 100% Match — Your types perfectly match the API response
                </span>
              ) : (
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-sm font-bold tabular-nums ${scoreColor(score!)}`}>
                      {score}% match
                    </span>
                    <div className="flex items-center gap-1.5">
                      {breaking.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {breaking.length} mismatch{breaking.length > 1 ? 'es' : ''}
                        </span>
                      )}
                      {warnings.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                          {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {infos.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {infos.length} info
                        </span>
                      )}
                    </div>
                    <div className="ml-auto">
                      <button
                        onClick={handleCopyReport}
                        className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Copy as Markdown report"
                      >
                        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                        {copied ? 'Copied!' : 'Copy report'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${score! >= 90 ? 'bg-green-500' : score! >= 60 ? 'bg-yellow-400' : 'bg-red-500'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      −15/mismatch · −5/warning
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {([
                { items: breaking, label: 'Type Mismatches',  labelCls: 'text-red-500/60' },
                { items: warnings, label: 'Warnings',         labelCls: 'text-amber-500/60' },
                { items: infos,    label: 'Info',             labelCls: 'text-slate-500/60' },
              ] as const).map(({ items, label, labelCls }) =>
                items.length > 0 && (
                  <div key={label} className="flex flex-col gap-1">
                    <p className={`text-[9px] font-mono uppercase tracking-widest px-1 pt-2 pb-0.5 ${labelCls}`}>
                      {label}
                    </p>
                    {items.map((d, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs ${severityBg(d.severity)}`}
                      >
                        {severityIcon(d.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <code className="font-mono text-[11px] text-slate-700 dark:text-[#D8D8D8]">
                              {d.path || 'root'}
                            </code>
                            {typeBadge(d.type, d.severity)}
                            {d.oldType && d.newType && (
                              <span className="font-mono text-[10px] text-slate-400">
                                declared: {d.oldType} → got: {d.newType}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 dark:text-[#686868] leading-relaxed">
                            {d.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}

        {!result && !error && (
          <p className="text-[11px] text-slate-400 dark:text-[#505050] text-center py-4">
            Paste your TypeScript interface and a real API response, then click Check Drift
          </p>
        )}
      </div>
    </div>
  );
}
