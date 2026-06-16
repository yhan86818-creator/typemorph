'use client';

import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Database, Layout, Server, Type, ShieldCheck, Download, Copy, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { inferSchema, parseYAML } from '@/lib/engine';
import { isOpenAPISpec, parseOpenAPIComponents } from '@/lib/openapi-parser';
import { isJSONSchema, parseJSONSchema } from '@/lib/jsonschema-parser';
import { tsGen, zodGen, prismaGen } from '@/lib/generators';

const toCamel = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const toPlural = (s: string) => s.toLowerCase() + 's';

function buildApiRoute(name: string, zodOutput: string): string {
  const schemaName = `${toCamel(name)}Schema`;
  const plural = toPlural(name);
  const schemaBlock = zodOutput
    .split('\n')
    .filter(line => !line.startsWith('export type '))
    .join('\n')
    .trim();

  return `import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Route: /api/${plural}

${schemaBlock}

export async function GET(_request: NextRequest) {
  try {
    const items: z.infer<typeof ${schemaName}>[] = [];
    // TODO: replace with your database query
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch ${plural}' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ${schemaName}.parse(body);
    // TODO: replace with your database insert
    return NextResponse.json(validated, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create ${name.toLowerCase()}' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ${schemaName}.parse(body);
    // TODO: replace with your database update
    return NextResponse.json(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update ${name.toLowerCase()}' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    // TODO: replace with your database delete
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete ${name.toLowerCase()}' }, { status: 500 });
  }
}`;
}

function buildReactHook(name: string, tsOutput: string): string {
  const plural = toPlural(name);

  return `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

${tsOutput.trim()}

const API_BASE = '/api/${plural}';

export const use${name}List = () =>
  useQuery<${name}[]>({
    queryKey: ['${plural}'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch ${plural}');
      return res.json();
    },
  });

export const use${name}ById = (id: string) =>
  useQuery<${name}>({
    queryKey: ['${plural}', id],
    queryFn: async () => {
      const res = await fetch(\`\${API_BASE}/\${id}\`);
      if (!res.ok) throw new Error('Failed to fetch ${name.toLowerCase()}');
      return res.json();
    },
    enabled: !!id,
  });

export const use${name}Create = () => {
  const queryClient = useQueryClient();
  return useMutation<${name}, Error, Partial<${name}>>({
    mutationFn: async (data) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create ${name.toLowerCase()}');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${plural}'] }),
  });
};

export const use${name}Update = () => {
  const queryClient = useQueryClient();
  return useMutation<${name}, Error, { id: string } & Partial<${name}>>({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(\`\${API_BASE}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update ${name.toLowerCase()}');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${plural}'] }),
  });
};

export const use${name}Delete = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ${name.toLowerCase()}');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${plural}'] }),
  });
};`;
}

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
      let parsed: any;
      try {
        parsed = JSON.parse(input);
      } catch {
        try {
          parsed = parseYAML(input);
        } catch {
          throw new Error('Input is not valid JSON or YAML');
        }
      }

      let schema: any;
      let name = 'Root';
      if (isOpenAPISpec(parsed)) {
        const components = parseOpenAPIComponents(parsed);
        if (components.length === 0) throw new Error('No components found in OpenAPI spec');
        schema = components[0].schema;
        name = components[0].name;
      } else if (isJSONSchema(parsed)) {
        const schemas = parseJSONSchema(parsed);
        if (schemas.length === 0) throw new Error('No schema found in JSON Schema input');
        schema = schemas[0].schema;
        name = schemas[0].name || (parsed as any).title || 'Root';
      } else {
        schema = inferSchema(parsed);
      }

      const tsOutput = tsGen.generate(schema, name);
      const zodOutput = zodGen.generate(schema, name, {});
      setOutput({
        types: tsOutput,
        validation: zodOutput,
        db: prismaGen.generate(schema, name),
        backend: buildApiRoute(name, zodOutput),
        frontend: buildReactHook(name, tsOutput),
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
