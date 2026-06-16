'use client';

import React, { useState, useCallback } from 'react';
import { ArrowLeftRight, AlertCircle, Info, TriangleAlert, CheckCircle2, FileJson, FileCode2, Copy, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { compareSchemaTypes, SchemaDiff } from '@/lib/diff';
import { inferSchema } from '@/lib/engine';
import { parseYAML } from '@/lib/engine';
import { isOpenAPISpec, parseOpenAPIComponents } from '@/lib/openapi-parser';
import { isJSONSchema, parseJSONSchema } from '@/lib/jsonschema-parser';
import type { Schema } from '@/lib/types';

type ParsedSchemas = { name: string; schema: Schema }[];

type FormatLabel = 'JSON' | 'YAML' | 'OpenAPI 3.x' | 'Swagger 2.0' | 'JSON Schema';

function detectAndParse(text: string): { schemas: ParsedSchemas; format: FormatLabel } {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty input');

  let obj: any;
  let format: FormatLabel = 'JSON';

  try {
    obj = JSON.parse(trimmed);
  } catch {
    try {
      obj = parseYAML(trimmed);
      format = 'YAML';
    } catch {
      throw new Error('Could not parse as JSON or YAML');
    }
  }

  if (isOpenAPISpec(obj)) {
    const o = obj as any;
    format = typeof o.swagger === 'string' ? 'Swagger 2.0' : 'OpenAPI 3.x';
    const schemas = parseOpenAPIComponents(obj);
    if (schemas.length === 0) throw new Error('No component schemas found in spec');
    return { schemas, format };
  }

  if (isJSONSchema(obj)) {
    format = 'JSON Schema';
    const schemas = parseJSONSchema(obj);
    if (schemas.length === 0) throw new Error('No schemas found in JSON Schema document');
    return { schemas, format };
  }

  const schema = inferSchema(obj);
  return { schemas: [{ name: 'Root', schema }], format };
}

function compatibilityScore(diffs: SchemaDiff[]): number {
  if (diffs.length === 0) return 100;
  const breakingCount = diffs.filter(d => d.severity === 'error').length;
  const warningCount = diffs.filter(d => d.severity === 'warning').length;
  const penalty = breakingCount * 15 + warningCount * 5;
  return Math.max(0, 100 - penalty);
}

function scoreColor(score: number) {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

const SAMPLE_A = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "required": ["id", "email"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "email": { "type": "string", "format": "email" },
    "role": { "type": "string", "enum": ["admin", "user"] },
    "age": { "type": "integer" }
  }
}`;

const SAMPLE_B = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "required": ["id", "email", "role"],
  "properties": {
    "id": { "type": "integer" },
    "email": { "type": "string", "format": "email" },
    "role": { "type": "string", "enum": ["admin", "user", "moderator"] },
    "displayName": { "type": "string" }
  }
}`;

export function SmartDiffView({ isDark, initialContent }: { isDark: boolean; initialContent?: string }) {
  const [textA, setTextA] = useState(initialContent ?? SAMPLE_A);
  const [textB, setTextB] = useState(SAMPLE_B);
  const [result, setResult] = useState<{
    diffs: SchemaDiff[];
    formatA: FormatLabel;
    formatB: FormatLabel;
    schemaCount: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCompare = useCallback(() => {
    setError('');
    try {
      const { schemas: schemasA, format: fmtA } = detectAndParse(textA);
      const { schemas: schemasB, format: fmtB } = detectAndParse(textB);

      const allDiffs: SchemaDiff[] = [];

      // Schemas removed entirely
      for (const { name } of schemasA) {
        if (!schemasB.find(s => s.name === name)) {
          allDiffs.push({
            path: name,
            type: 'removed',
            severity: 'error',
            description: `Schema '${name}' was completely removed.`,
          });
        }
      }

      // Schemas added
      for (const { name } of schemasB) {
        if (!schemasA.find(s => s.name === name)) {
          allDiffs.push({
            path: name,
            type: 'added',
            severity: 'info',
            description: `New schema '${name}' added.`,
          });
        }
      }

      // Compare matching schemas
      for (const { name, schema: schemaA } of schemasA) {
        const matchB = schemasB.find(s => s.name === name);
        if (matchB) {
          const prefix = schemasA.length > 1 ? name : 'root';
          allDiffs.push(...compareSchemaTypes(schemaA, matchB.schema, prefix));
        }
      }

      setResult({
        diffs: allDiffs,
        formatA: fmtA,
        formatB: fmtB,
        schemaCount: schemasA.length,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Parse error');
      setResult(null);
    }
  }, [textA, textB]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompare();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCompare]);

  const breaking = result?.diffs.filter(d => d.severity === 'error') ?? [];
  const warnings = result?.diffs.filter(d => d.severity === 'warning') ?? [];
  const infos = result?.diffs.filter(d => d.severity === 'info') ?? [];
  const score = result ? compatibilityScore(result.diffs) : null;

  const handleCopyReport = useCallback(() => {
    if (!result || score === null) return;
    const lines: string[] = [
      `# Breaking Change Report`,
      `Compatibility: ${score}% (${breaking.length} breaking, ${warnings.length} warnings, ${infos.length} info)`,
      `Score formula: 100 - (breaking × 15) - (warning × 5)`,
      '',
    ];
    if (breaking.length > 0) {
      lines.push('## Breaking Changes');
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
      removed:          redCls,
      type_changed:     redCls,
      required_changed: severityCls,
      enum_changed:     severityCls,
      nullable_changed: slateCls,
      format_changed:   slateCls,
      added:            slateCls,
    };
    const label: Record<SchemaDiff['type'], string> = {
      removed: 'removed', added: 'added', type_changed: 'type',
      required_changed: 'required', enum_changed: 'enum',
      format_changed: 'format', nullable_changed: 'nullable',
    };
    return (
      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${cls[t]}`}>
        {label[t]}
      </span>
    );
  };

  const formatBadge = (f: FormatLabel) => (
    <span className="flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
      {f.includes('OpenAPI') || f.includes('Swagger') || f === 'JSON Schema'
        ? <FileCode2 size={10} />
        : <FileJson size={10} />}
      {f}
    </span>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] overflow-hidden">

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-[#1A1A1A] shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#E8E8E8]">Breaking Change Detector</h2>
          <p className="text-[11px] text-slate-400 dark:text-[#606060] mt-0.5">
            JSON · YAML · OpenAPI · JSON Schema — paste any two versions
          </p>
        </div>
        <button
          onClick={handleCompare}
          className="flex items-center gap-2 px-4 py-2 text-slate-900 dark:text-white text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title="Cmd+Enter or Ctrl+Enter"
        >
          <ArrowLeftRight size={12} />
          Compare
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
        {[
          { label: 'Version A (Before)', value: textA, onChange: setTextA, dot: 'bg-red-400', fmt: result?.formatA },
          { label: 'Version B (After)',  value: textB, onChange: setTextB, dot: 'bg-green-400', fmt: result?.formatB },
        ].map(({ label, value, onChange, dot, fmt }) => (
          <div key={label} className="flex flex-col border border-slate-200 dark:border-[#1A1A1A] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F]">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-[10px] font-mono uppercase text-slate-400 flex-1">{label}</span>
              {fmt && formatBadge(fmt)}
            </div>
            <Editor
              height="100%"
              defaultLanguage="json"
              value={value}
              onChange={v => onChange(v || '')}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false }, fontSize: 12,
                scrollBeyondLastLine: false, padding: { top: 10, bottom: 10 },
                automaticLayout: true, wordWrap: 'on',
              }}
            />
          </div>
        ))}
      </div>

      {/* 結果パネル */}
      <div className="px-4 py-3 shrink-0 max-h-[45%] overflow-y-auto">
        {result && (
          <>
            {/* サマリーバー */}
            <div className="flex items-start gap-3 mb-3 flex-wrap">
              {result.diffs.length === 0 ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle2 size={14} /> 100% Compatible — No changes detected
                </span>
              ) : (
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Score row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-sm font-bold tabular-nums ${scoreColor(score!)}`}>
                      {score}% compatible
                    </span>
                    <div className="flex items-center gap-1.5">
                      {breaking.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {breaking.length} breaking
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
                    <div className="ml-auto flex items-center gap-2">
                      {result.schemaCount > 1 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {result.schemaCount} schemas
                        </span>
                      )}
                      {/* Copy Report button */}
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
                  {/* Score bar + formula hint */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${score! >= 90 ? 'bg-green-500' : score! >= 60 ? 'bg-yellow-400' : 'bg-red-500'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap"
                      title="Score = 100 - (breaking × 15) - (warning × 5)"
                    >
                      −15/breaking · −5/warning
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 差分リスト */}
            <div className="flex flex-col gap-1">
              {([
                { items: breaking, label: 'Breaking Changes', labelCls: 'text-red-500/60' },
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
                                {d.oldType} → {d.newType}
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
            Paste two versions of a schema above and click Compare
          </p>
        )}
      </div>
    </div>
  );
}
