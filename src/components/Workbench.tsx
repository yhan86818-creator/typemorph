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
import { JsonVisualizer, Toast } from './SharedUI';
import { History as HistoryIcon, Clock } from 'lucide-react';

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
  const [history, setHistory] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [aiStatus, setAiStatus] = useState("");

  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);

  const handleAiSmartParse = useCallback(async () => {
    if (!geminiKey) return;
    setIsAiLoading(true);
    try {
      setAiStatus("Analyzing structure...");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Clean this input into valid minified JSON. If it's a log, extract the primary object. Return ONLY the JSON: ${inputRef.current}` }] }]
        })
      });
      setAiStatus("Extracting logic...");
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setAiStatus("Success!");
        setInput(text.replace(/```json/g, '').replace(/```/g, '').trim());
      }
    } catch (e) { 
      setAiStatus("Failed.");
      console.error(e); 
    }
    finally { 
      setTimeout(() => {
        setIsAiLoading(false);
        setAiStatus("");
      }, 1000);
    }
  }, [geminiKey]); // Only depend on geminiKey

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

  // History Management
  useEffect(() => {
    const saved = localStorage.getItem('typeflow_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = useCallback((content: string) => {
    if (!content || content.length < 10) return;
    setHistory(prev => {
      const filtered = prev.filter(h => h.content !== content);
      const next = [{ content, timestamp: new Date().toISOString() }, ...filtered].slice(0, 5);
      localStorage.setItem('typeflow_history', JSON.stringify(next));
      return next;
    });
  }, []);

  // Auto-save history after idle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input && input.length > 20) saveToHistory(input);
    }, 3000);
    return () => clearTimeout(timer);
  }, [input, saveToHistory]);

  // Initial Sample Data & Magic Data Handling
  const lastSlug = useRef('');
  useEffect(() => {
    const magicData = localStorage.getItem('typeflow_magic_data');
    if (magicData) {
      setInput(magicData);
      localStorage.removeItem('typeflow_magic_data');
      if (geminiKey) {
        setTimeout(() => handleAiSmartParse(), 500);
      }
    } else if (lastSlug.current !== slug && !input) {
      const samples: any = {
        'json-to-typescript': `{ "user": { "id": 1, "name": "Kouki" } }`,
        'curl-to-fetch': `curl -X GET 'https://api.example.com'`,
        'sql-to-zod': `CREATE TABLE users (id INT, name TEXT);`
      };
      setInput(samples[slug] || `{\n  "status": "ready",\n  "tool": "${slug}"\n}`);
    }
    lastSlug.current = slug;
  }, [slug, geminiKey]); // Removed handleAiSmartParse from dependency

  const tabs = [
    { id: 'typescript', label: 'TS' },
    { id: 'zod', label: 'Zod' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
    { id: 'python', label: 'Python' },
    { id: 'dart', label: 'Dart' },
    { id: 'php', label: 'PHP' },
    { id: 'java', label: 'Java' },
    { id: 'kotlin', label: 'Kotlin' },
    { id: 'swift', label: 'Swift' },
    { id: 'protobuf', label: 'Proto' },
    { id: 'graphql', label: 'GQL' },
    { id: 'sql', label: 'SQL' },
    { id: 'jsonschema', label: 'Schema' },
    { id: 'ui', label: 'UI' },
    { id: 'json', label: 'JSON' }
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] p-6 gap-6 bg-slate-50 dark:bg-[#020617]">
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
              {isAiLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{aiStatus}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles size={12} />
                  <span>AI Smart Parse</span>
                </div>
              )}
            </button>
            <button onClick={() => setInput("")} className="text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={16}/>
            </button>
          </div>
        </div>

        {/* Recent History Chips */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
            <span className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-300 tracking-tighter shrink-0">
              <Clock size={10} /> History:
            </span>
            {history.map((h, i) => (
              <button 
                key={i}
                onClick={() => setInput(h.content)}
                className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-all truncate max-w-[120px]"
                title={h.content.slice(0, 100)}
              >
                {h.content.trim().slice(0, 15)}...
              </button>
            ))}
          </div>
        )}

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
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 max-w-[calc(100%-100px)]">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setOutputTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${outputTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const code = outputs[outputTab] || "";
                const prompt = `Here is a ${outputTab} definition. Please write a production-ready React component or service that utilizes this structure:\n\n\`\`\`${outputTab}\n${code}\n\`\`\``;
                navigator.clipboard.writeText(prompt);
                setToastMsg("Prompt Copied!");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
              }}
              className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900 hover:bg-blue-600 hover:text-white transition-all"
            >
              <Zap size={12} /> AI Prompt
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(outputs[outputTab] || "");
                setIsCopied(true);
                setToastMsg(`${outputTab.toUpperCase()} Copied!`);
                setShowToast(true);
                setTimeout(() => {
                  setIsCopied(false);
                  setShowToast(false);
                }, 2000);
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-white bg-[#0F172A] dark:bg-blue-600 px-4 py-1.5 rounded-lg shadow-lg hover:scale-[1.02] transition-all shrink-0"
            >
              <Copy size={12} /> {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
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
      <Toast isVisible={showToast} message={toastMsg} />
    </div>
  );
}
