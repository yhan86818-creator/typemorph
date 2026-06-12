'use client';

import React, { useState, useCallback } from 'react';
import { ArrowLeftRight, Copy, CheckCircle2, AlertCircle, Info, TriangleAlert } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { compareSchemas, SchemaDiff } from '@/lib/diff';

export function SmartDiffView({ isDark }: { isDark: boolean }) {
  const [jsonA, setJsonA] = useState('{\n  "id": 101,\n  "user": "jdoe",\n  "status": "active"\n}');
  const [jsonB, setJsonB] = useState('{\n  "id": 101,\n  "username": "jdoe",\n  "status": "pending",\n  "tags": ["beta"]\n}');
  const [diffs, setDiffs] = useState<SchemaDiff[]>([]);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const handleCompare = useCallback(() => {
    setError('');
    try {
      const a = JSON.parse(jsonA);
      const b = JSON.parse(jsonB);
      const result = compareSchemas(a, b);
      setDiffs(result);
      setHasRun(true);
    } catch (err: any) {
      setError('Invalid JSON: ' + (err?.message ?? 'Parse error'));
      setDiffs([]);
    }
  }, [jsonA, jsonB]);

  // Cmd+Enter / Ctrl+Enter で比較
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompare();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCompare]);

  const errors = diffs.filter(d => d.severity === 'error');
  const warnings = diffs.filter(d => d.severity === 'warning');
  const infos = diffs.filter(d => d.severity === 'info');

  const severityIcon = (s: SchemaDiff['severity']) => {
    if (s === 'error') return <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />;
    if (s === 'warning') return <TriangleAlert size={14} className="text-yellow-500 shrink-0 mt-0.5" />;
    return <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />;
  };

  const severityBg = (s: SchemaDiff['severity']) => {
    if (s === 'error') return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50';
    if (s === 'warning') return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50';
    return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50';
  };

  const typeBadge = (t: SchemaDiff['type']) => {
    if (t === 'removed') return <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">removed</span>;
    if (t === 'added') return <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">added</span>;
    return <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">changed</span>;
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 bg-white dark:bg-[#0A0A0A]">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#E8E8E8]">Schema Diff</h2>
          <p className="text-xs text-slate-400 dark:text-[#707070]">Detect breaking changes between two JSON payloads</p>
        </div>
        <button
          onClick={handleCompare}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-all"
          title="Cmd+Enter or Ctrl+Enter"
        >
          <ArrowLeftRight size={13} />
          Compare
          <span className="text-[9px] opacity-60 border border-white/30 px-1 py-0.5 rounded">⌘↵</span>
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* エディター2面 */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col border border-slate-200 dark:border-[#1A1A1A] rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F]">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400">JSON A (Original)</span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={jsonA}
            onChange={(v) => setJsonA(v || '')}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, padding: { top: 12, bottom: 12 }, automaticLayout: true, wordWrap: 'on' }}
          />
        </div>
        <div className="flex flex-col border border-slate-200 dark:border-[#1A1A1A] rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F]">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400">JSON B (Modified)</span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={jsonB}
            onChange={(v) => setJsonB(v || '')}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, padding: { top: 12, bottom: 12 }, automaticLayout: true, wordWrap: 'on' }}
          />
        </div>
      </div>

      {/* 結果 */}
      {hasRun && (
        <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto">

          {/* サマリー */}
          <div className="flex items-center gap-3">
            {diffs.length === 0 ? (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> No differences detected
              </span>
            ) : (
              <>
                {errors.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    {errors.length} breaking
                  </span>
                )}
                {warnings.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                    {warnings.length} warning
                  </span>
                )}
                {infos.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {infos.length} added
                  </span>
                )}
              </>
            )}
          </div>

          {/* 差分リスト */}
          <div className="flex flex-col gap-2">
            {diffs.map((d, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${severityBg(d.severity)}`}>
                {severityIcon(d.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="font-mono text-slate-700 dark:text-[#E8E8E8] truncate">{d.path}</code>
                    {typeBadge(d.type)}
                    {d.oldType && d.newType && (
                      <span className="text-slate-400 font-mono text-[10px]">{d.oldType} → {d.newType}</span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-[#707070] leading-relaxed">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
