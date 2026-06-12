'use client';

import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Database, Layout, Server, Type, ShieldCheck, Download, Copy, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { inferSchema } from '@/lib/engine';
import { tsGen, zodGen, prismaGen } from '@/lib/generators';
import { apiRouteGen, reactHookGen } from '@/lib/generators-extended';

const TABS = [
  { id: 'types', label: 'Types', icon: <Type size={13} />, language: 'typescript' },
  { id: 'validation', label: 'Zod', icon: <ShieldCheck size={13} />, language: 'typescript' },
  { id: 'db', label: 'Prisma', icon: <Database size={13} />, language: 'prisma' },
  { id: 'backend', label: 'API Route', icon: <Server size={13} />, language: 'typescript' },
  { id: 'frontend', label: 'React Hook', icon: <Layout size={13} />, language: 'typescript' },
];

interface Props {
  isDark: boolean;
}

export function FullStackArchitectView({ isDark }: Props) {
  const [input, setInput] = useState(`{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "status": "active"
  }
}`);
  const [output, setOutput] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('types');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    setError('');
    setIsProcessing(true);
    try {
      const parsed = JSON.parse(input);
      const schema = inferSchema(parsed);
      const name = 'Root';

      setOutput({
        types: tsGen.generate(schema, name),
        validation: zodGen.generate(schema, name),
        db: prismaGen.generate(schema, name),
        backend: apiRouteGen.generate(schema, name),
        frontend: reactHookGen.generate(schema, name),
      });
    } catch (err: any) {
      setError('Invalid JSON: ' + (err?.message ?? 'Parse error'));
    } finally {
      setIsProcessing(false);
    }
  }, [input]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        generate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generate]);

  const handleDownloadZip = async () => {
    if (!Object.keys(output).length) return;
    const zip = new JSZip();
    zip.file('types.ts', output.types || '');
    zip.file('schema.zod.ts', output.validation || '');
    zip.file('schema.prisma', output.db || '');
    zip.file('route.ts', output.backend || '');
    zip.file('hooks.ts', output.frontend || '');
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'typemorph-fullstack.zip');
  };

  const handleCopy = () => {
    const current = output[activeTab] || '';
    navigator.clipboard.writeText(current);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLang = TABS.find(t => t.id === activeTab)?.language || 'typescript';

  return (
    <div className="flex flex-col h-full p-4 gap-4 bg-white dark:bg-[#0A0A0A]">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#E8E8E8]">Full-Stack Architect</h2>
          <p className="text-xs text-slate-400 dark:text-[#707070]">Generate Types · Zod · Prisma · API Route · React Hook from JSON</p>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(output).length > 0 && (
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#222222] rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-all"
            >
              <Download size={12} />
              Download ZIP
            </button>
          )}
          <button
            onClick={generate}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 text-slate-900 dark:text-white text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
            title="Cmd+Enter or Ctrl+Enter"
          >
            {isProcessing ? 'Generating...' : 'Generate'}
            <span className="text-[9px] opacity-50 border border-slate-300 dark:border-slate-600 px-1 py-0.5 rounded">⌘↵</span>
          </button>
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* メインエリア */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">

        {/* 左：JSON入力 */}
        <div className="flex flex-col border border-slate-200 dark:border-[#1A1A1A] rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F]">
            <span className="text-[10px] font-mono uppercase text-slate-400">JSON Input</span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={input}
            onChange={(v) => setInput(v || '')}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, padding: { top: 12, bottom: 12 }, automaticLayout: true, wordWrap: 'on' }}
          />
        </div>

        {/* 右：出力タブ */}
        <div className="flex flex-col border border-slate-200 dark:border-[#1A1A1A] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F]">
            <div className="flex items-center gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-all ${activeTab === tab.id ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <Editor
            height="100%"
            language={currentLang}
            value={output[activeTab] || '// Press Generate (⌘↵) to generate full-stack code from your JSON'}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{ minimap: { enabled: false }, fontSize: 12, readOnly: true, scrollBeyondLastLine: false, padding: { top: 12, bottom: 12 }, automaticLayout: true, wordWrap: 'on' }}
          />
        </div>
      </div>
    </div>
  );
}
