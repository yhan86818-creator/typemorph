'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import LZString from 'lz-string';
import { 
  Terminal, Share2, Copy, FileJson, Sparkles, Settings, Loader2, Monitor, Trash2, Code2, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  runEngine, parseYAML, parseXML, parseCurl, curlToTypeScript, parseSQLToZod 
} from '@/lib/engine';
import { JsonVisualizer } from './SharedUI';

interface WorkbenchProps {
  slug: string;
  isDark: boolean;
  geminiKey: string;
  outputTab: string;
  setOutputTab: (tab: string) => void;
}

export function Workbench({ slug, isDark, geminiKey, outputTab, setOutputTab }: WorkbenchProps) {
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [outputs, setOutputs] = useState<any>({});
  const [jsonData, setJsonData] = useState<any>(null);

  // Initial Sample Data
  useEffect(() => {
    const samples: any = {
      'json-to-typescript': `{ "user": { "id": 1, "name": "Kouki" } }`,
      'curl-to-fetch': `curl -X GET 'https://api.example.com'`,
      'sql-to-zod': `CREATE TABLE users (id INT, name TEXT);`
    };
    setInput(samples[slug] || `{\n  "status": "ready",\n  "tool": "${slug}"\n}`);
  }, [slug]);

  const processInput = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    let res: any = {};
    let jsonObj: any = null;
    
    if (trimmed.toLowerCase().startsWith('curl')) {
      const parsed = parseCurl(trimmed);
      res.hook = curlToTypeScript(parsed);
      if (parsed.bodyJson) {
        setJsonData(parsed.bodyJson);
        res.typescript = runEngine(parsed.bodyJson, 'typescript', slug);
      }
    } 
    else if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
      res.zod = parseSQLToZod(trimmed);
    }
    else {
      try {
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) jsonObj = JSON.parse(trimmed);
        else if (trimmed.startsWith('<')) jsonObj = parseXML(trimmed);
        else jsonObj = parseYAML(trimmed);
      } catch (e) {}

      if (jsonObj) {
        setJsonData(jsonObj);
        ['typescript', 'zod', 'go', 'rust', 'java', 'python', 'dart', 'php', 'protobuf', 'graphql', 'swift', 'kotlin', 'sql', 'jsonschema'].forEach(lang => {
          res[lang] = runEngine(jsonObj, lang, slug);
        });
        res.json = JSON.stringify(jsonObj, null, 2);
      }
    }
    setOutputs(res);
  }, [input, slug]);

  useEffect(() => { processInput(); }, [processInput]);

  const handleAiSmartParse = async () => {
    if (!geminiKey) return;
    setIsAiLoading(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Clean this input into valid minified JSON: ${input}` }] }]
        })
      });
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setInput(text.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) { console.error(e); }
    finally { setIsAiLoading(false); }
  };

  const tabs = [
    { id: 'typescript', label: 'TS' },
    { id: 'zod', label: 'Zod' },
    { id: 'go', label: 'Go' },
    { id: 'python', label: 'Python' },
    { id: 'rust', label: 'Rust' },
    { id: 'dart', label: 'Dart' },
    { id: 'php', label: 'PHP' },
    { id: 'graphql', label: 'GQL' },
    { id: 'protobuf', label: 'Proto' },
    { id: 'sql', label: 'SQL' },
    { id: 'ui', label: 'UI' },
    { id: 'json', label: 'JSON' }
  ];

  return (
    <div className="flex flex-col md:flex-row h-full p-6 gap-6 bg-slate-50 dark:bg-[#020617]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <Terminal size={14}/> Input Source
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleAiSmartParse}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900"
            >
              {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AI Smart Parse
            </button>
            <button onClick={() => setInput("")} className="text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={16}/>
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <Editor
            height="100%"
            theme={isDark ? "vs-dark" : "light"}
            defaultLanguage="json"
            value={input}
            onChange={(v) => setInput(v || "")}
            options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 24, bottom: 24 }, automaticLayout: true }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            {tabs.slice(0, 8).map(tab => (
              <button 
                key={tab.id}
                onClick={() => setOutputTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${outputTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(outputs[outputTab] || "");
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className="flex items-center gap-2 text-[10px] font-black uppercase text-white bg-[#0F172A] dark:bg-blue-600 px-4 py-1.5 rounded-lg shadow-lg hover:scale-[1.02] transition-all ml-4 shrink-0"
          >
            <Copy size={12} /> {isCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
          <Editor
            height="100%"
            theme={isDark ? "vs-dark" : "light"}
            language={outputTab}
            value={outputs[outputTab] || "// Generate code..."}
            options={{ minimap: { enabled: false }, fontSize: 13, readOnly: true, automaticLayout: true, padding: { top: 24, bottom: 24 } }}
          />
          
          {jsonData && (
            <div className="absolute bottom-6 right-6 w-80 max-h-80 overflow-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 no-scrollbar">
              <JsonVisualizer data={jsonData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
