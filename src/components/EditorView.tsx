'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import LZString from 'lz-string';
import { 
  Layout, Code2, Crown, History, Terminal, Trash2, 
  Share2, Layers, Copy, Check, FileJson, Sparkles, Settings, Loader2, Monitor, CheckCircle2 
} from 'lucide-react';
import { 
  runEngine, parseYAML, parseXML, parseCurl, curlToTypeScript, parseSQLToZod 
} from '@/lib/engine';
import { JsonVisualizer } from './SharedUI';

interface EditorViewProps {
  isPro: boolean;
  trialCount: number;
  setTrialCount: (c: number) => void;
  isDark: boolean;
  initialSlug?: string;
  geminiKey: string;
  setGeminiKey: (k: string) => void;
}

export function EditorView({ isPro, trialCount, setTrialCount, isDark, initialSlug = "", geminiKey, setGeminiKey }: EditorViewProps) {
  const [input, setInput] = useState(`{
  "project": "TypeFlow Pro",
  "features": ["AI Smart Parse", "UI Gen", "117+ Converters"],
  "stats": {
    "users": 15000,
    "conversions_per_day": 42000,
    "uptime": 0.9999
  },
  "is_ready": true,
  "last_updated": "2026-05-10"
}`);
  const [outputTab, setOutputTab] = useState('typescript');
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'info' } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<any>({});
  const [jsonData, setJsonData] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setInput(text);
          showToast("File imported successfully");
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    // 1. URL Hash Restoration
    const hash = window.location.hash.substring(1);
    if (hash) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(hash);
        if (decompressed) {
          setInput(decompressed);
          return;
        }
      } catch (e) { console.error(e); }
    }

    // 2. Initial Slug Sampling
    if (initialSlug) {
      const samples: any = {
        'json-to-typescript': `{
  "status": "success",
  "data": {
    "user": {
      "id": "u_9921",
      "profile": {
        "firstName": "Kouki",
        "lastName": "Tanaka",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Kouki",
        "settings": {
          "theme": "dark",
          "notifications": true,
          "roles": ["admin", "editor", "v_vip"]
        }
      },
      "stats": {
        "last_login": "2026-05-10T23:21:15Z",
        "login_count": 142,
        "is_active": true
      }
    },
    "projects": [
      { "id": 1, "name": "TypeFlow Pro", "version": "2.1.0", "labels": ["AI", "SaaS"] },
      { "id": 2, "name": "DevFlow Engine", "version": "1.0.4", "labels": ["Local-First"] }
    ]
  }
}`,
        'curl-to-fetch': `curl -X POST 'https://api.typeflow.pro/v1/analyze' \\
  -H 'Authorization: Bearer tf_live_99218831' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Request-ID: req_882199' \\
  -d '{
    "model": "gemini-1.5-flash",
    "prompt": "Optimize this JSON structure",
    "options": {
      "temperature": 0.7,
      "max_tokens": 2048,
      "stream": false
    },
    "metadata": {
      "source": "workbench_v2",
      "tags": ["critical", "production"]
    }
  }'`,
        'sql-to-zod': `CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  age INT CHECK (age >= 18),
  is_verified BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
        'json-to-java-class': `{
  "orderId": "ORD-2026-X88",
  "customer": {
    "name": "Global Tech Corp",
    "taxId": "JP-12345678",
    "address": {
      "city": "Tokyo",
      "zip": "100-0001"
    }
  },
  "items": [
    { "sku": "SF-001", "price": 12000, "qty": 2 },
    { "sku": "SF-005", "price": 5000, "qty": 10 }
  ],
  "total": 74000
}`,
        'json-to-pydantic': `{
  "id": "task_442",
  "execution": {
    "node": "cluster-aws-01",
    "status": "completed",
    "runtime_ms": 1420
  },
  "logs": [
    { "ts": 1715340000, "level": "INFO", "msg": "Job started" },
    { "ts": 1715341420, "level": "SUCCESS", "msg": "Artifacts generated" }
  ]
}`
      };
      const defaultSample = '{\n  "hello": "world",\n  "count": 42,\n  "tags": ["seo", "tool"]\n}';
      setInput(samples[initialSlug] || defaultSample);

      // Auto-set tab based on slug
      if (initialSlug.includes('zod')) setOutputTab('zod');
      else if (initialSlug.includes('go')) setOutputTab('go');
      else if (initialSlug.includes('python') || initialSlug.includes('pydantic')) setOutputTab('python');
      else if (initialSlug.includes('java')) setOutputTab('java');
      else if (initialSlug.includes('swift')) setOutputTab('swift');
      else if (initialSlug.includes('sql')) setOutputTab('sql');
      else if (initialSlug.includes('rust')) setOutputTab('rust');
    }
  }, [initialSlug]);

  const share = () => {
    const compressed = LZString.compressToEncodedURIComponent(input);
    const url = `${window.location.origin}${window.location.pathname}#${compressed}`;
    navigator.clipboard.writeText(url);
    setIsShareCopied(true);
    showToast("Share link copied to clipboard");
    window.location.hash = compressed;
    setTimeout(() => setIsShareCopied(false), 2000);
  };

  const formatInput = () => {
    try {
      const obj = JSON.parse(input);
      setInput(JSON.stringify(obj, null, 2));
      showToast("Input formatted");
    } catch (e) {
      showToast("Invalid JSON to format", "info");
    }
  };

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
        res.typescript = runEngine(parsed.bodyJson, 'typescript', initialSlug);
        res.zod = runEngine(parsed.bodyJson, 'zod', initialSlug);
      }
      setOutputTab('hook');
    } 
    else if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
      res.zod = parseSQLToZod(trimmed);
      setOutputTab('zod');
    }
    else {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { jsonObj = JSON.parse(trimmed); } catch (e) {}
      } else if (trimmed.startsWith('---') || (trimmed.includes(':') && !trimmed.includes('<'))) {
        jsonObj = parseYAML(trimmed);
      } else if (trimmed.startsWith('<')) {
        jsonObj = parseXML(trimmed);
      }
      if (jsonObj) {
        setJsonData(jsonObj);
        res.typescript = runEngine(jsonObj, 'typescript', initialSlug);
        res.zod = runEngine(jsonObj, 'zod', initialSlug);
        res.go = runEngine(jsonObj, 'go', initialSlug);
        res.rust = runEngine(jsonObj, 'rust', initialSlug);
        res.java = runEngine(jsonObj, 'java', initialSlug);
        res.python = runEngine(jsonObj, 'python', initialSlug);
        res.csharp = runEngine(jsonObj, 'csharp', initialSlug);
        res.swift = runEngine(jsonObj, 'swift', initialSlug);
        res.kotlin = runEngine(jsonObj, 'kotlin', initialSlug);
        res.sql = runEngine(jsonObj, 'sql', initialSlug);
        res.jsonschema = JSON.stringify(runEngine(jsonObj, 'jsonschema', initialSlug), null, 2);
        res.json = JSON.stringify(jsonObj, null, 2);
      }
    }
    setOutputs(res);
  }, [input, initialSlug]);

  useEffect(() => { processInput(); }, [processInput]);

  const copy = () => {
    navigator.clipboard.writeText(outputs[outputTab] || "");
    setIsCopied(true);
    showToast(`${outputTab.toUpperCase()} code copied!`);
    setTimeout(() => setIsCopied(false), 2000);
    if (!history.includes(input)) setHistory([input, ...history].slice(0, 10));
  };

  const tabs = [
    { id: 'typescript', label: 'TS' },
    { id: 'zod', label: 'Zod' },
    { id: 'go', label: 'Go' },
    { id: 'python', label: 'Python' },
    { id: 'rust', label: 'Rust', pro: true },
    { id: 'java', label: 'Java', pro: true },
    { id: 'csharp', label: 'C#', pro: true },
    { id: 'swift', label: 'Swift', pro: true },
    { id: 'kotlin', label: 'Kotlin', pro: true },
    { id: 'sql', label: 'SQL/Prisma', pro: true },
    { id: 'hook', label: 'React Hook', pro: true },
    { id: 'jsonschema', label: 'Schema', pro: true },
    { id: 'ui', label: 'UI Components', pro: true, icon: <Monitor size={12}/> },
    { id: 'json', label: 'JSON', icon: <FileJson size={10}/> }
  ];

  const useTrial = (tabId: string) => {
    if (outputTab === tabId) return; // Already here, don't count
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.pro && !isPro) {
      if (trialCount <= 0) {
        setOutputTab(tabId); // Let them see the blur/upsell
        return;
      }
      const newCount = trialCount - 1;
      setTrialCount(newCount);
      localStorage.setItem('typeflow_trial_count', newCount.toString());
    }
    setOutputTab(tabId);
  };

  const editorRef = useRef<any>(null);
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const handleAiSmartParse = async () => {
    if (!geminiKey) {
      setShowAiSettings(true);
      return;
    }
    if (!input.trim()) return;
    
    // Trial check
    if (!isPro) {
      if (trialCount <= 0) {
        alert("You have used all your daily trials. Please upgrade to Pro for unlimited AI parsing!");
        return;
      }
      const newCount = trialCount - 1;
      setTrialCount(newCount);
      localStorage.setItem('typeflow_trial_count', newCount.toString());
    }

    setIsAiLoading(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Transform the following input into a clean, valid, minified JSON object. 
              Output ONLY the raw JSON string, no markdown, no explanations. 
              If the input is already JSON, clean it up and flatten nested structures if it makes sense for a TypeScript interface.
              Input: ${input}`
            }]
          }]
        })
      });
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Remove markdown code blocks if AI included them
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        setInput(cleaned);
      }
    } catch (e) {
      console.error(e);
      alert("AI Error: Please check your API Key or connection.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const inputMode = input.trim().startsWith('<') ? 'xml' : (input.trim().startsWith('---') || input.includes(': ')) ? 'yaml' : 'json';

  return (
    <>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-[#020617]">
        {/* AI Settings Modal */}
        <AnimatePresence>
          {showAiSettings && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowAiSettings(false)}
                className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-xl shadow-blue-100 dark:shadow-none">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-2xl font-black text-center mb-2 dark:text-white text-slate-900">AI Intelligence Settings</h2>
                <p className="text-center text-slate-400 text-sm mb-8 font-medium">Power up your workflow with Google Gemini AI for smart data parsing.</p>
                <div className="space-y-4 mb-8">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Google AI Studio API Key</label>
                    <input 
                      type="password" 
                      placeholder="AI Studio API Key" 
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 rounded-2xl text-sm outline-none focus:border-blue-600 transition-all dark:text-white"
                    />
                  </div>
                  <button 
                    onClick={() => setShowAiSettings(false)}
                    className="w-full bg-[#0F172A] dark:bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 dark:shadow-none hover:scale-[1.02] transition-all"
                  >
                    Save & Enable AI
                  </button>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" className="block text-center text-xs font-bold text-blue-600 hover:underline">Get a free key from Google AI Studio →</a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden xl:flex flex-col p-6">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"><Layout size={14}/> Target Output</h3>
          <div className="space-y-1 mb-8 overflow-y-auto max-h-[45%] no-scrollbar pr-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => useTrial(tab.id)} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${outputTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                <span className="flex items-center gap-2">{tab.icon || <Code2 size={12}/>} {tab.label}</span>
                {tab.pro && <Crown size={12} className={outputTab === tab.id ? 'text-blue-500' : 'text-amber-400'} />}
              </button>
            ))}
          </div>
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><History size={14}/> History</span>
            <button onClick={() => setHistory([])} className="hover:text-red-500 transition-colors uppercase text-[8px]">Clear</button>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-2">
            {history.map((h, i) => (
              <button key={i} onClick={() => setInput(h)} className="w-full text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all shadow-sm">
                <p className="text-[9px] text-slate-400 font-mono truncate">{h.slice(0, 40)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row p-6 gap-6">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Terminal size={14}/> Input Source
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={formatInput}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
                  title="Format JSON"
                >
                  <Terminal size={12} /> Format
                </button>
                <button 
                  onClick={handleAiSmartParse}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900 hover:bg-blue-100 transition-all disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isAiLoading ? 'Analyzing...' : 'AI Smart Parse'}
                </button>
                <button onClick={() => setShowAiSettings(true)} className="text-slate-400 hover:text-blue-600 transition-colors">
                  <Settings size={16} />
                </button>
                <button onClick={()=>setInput("")} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
            <div 
              className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-inner overflow-hidden border border-slate-200 dark:border-slate-800"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Editor
                height="100%"
                theme={isDark ? "vs-dark" : "light"}
                language={inputMode}
                value={input}
                onChange={(v) => setInput(v || "")}
                onMount={handleEditorDidMount}
                options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'var(--font-jetbrains-mono)', padding: { top: 24, bottom: 24 }, scrollBeyondLastLine: false, automaticLayout: true }}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Code2 size={14}/> {outputTab.toUpperCase()} Output
              </span>
              <div className="flex items-center gap-2">
                <button onClick={share} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all">
                  <Share2 size={12} /> {isShareCopied ? 'Link Copied' : 'Share'}
                </button>
                <button onClick={copy} className="flex items-center gap-2 text-[10px] font-black uppercase text-white bg-[#0F172A] dark:bg-blue-600 px-4 py-1.5 rounded-lg shadow-lg shadow-blue-100 dark:shadow-none hover:scale-[1.02] transition-all">
                  <Copy size={12} /> {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-inner overflow-hidden border border-slate-200 dark:border-slate-800 relative group">
              <div className={`h-full transition-all duration-300 ${!isPro && tabs.find(t=>t.id===outputTab)?.pro && trialCount <= 0 ? 'blur-[3px] select-none pointer-events-none' : ''}`}>
                <Editor
                  height="100%"
                  onMount={handleEditorDidMount}
                  theme={isDark ? "vs-dark" : "light"}
                  language={outputTab === 'typescript' || outputTab === 'zod' || outputTab === 'ui' || outputTab === 'hook' ? 'typescript' : outputTab === 'go' ? 'go' : outputTab === 'rust' ? 'rust' : outputTab === 'java' ? 'java' : outputTab === 'sql' ? 'sql' : 'json'}
                  value={outputs[outputTab] || "// Generate code..."}
                  options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'var(--font-jetbrains-mono)', readOnly: true, automaticLayout: true, padding: { top: 24, bottom: 24 } }}
                />
              </div>
              
              {!isPro && tabs.find(t=>t.id===outputTab)?.pro && trialCount <= 0 && (
                <div className="absolute inset-0 flex flex-col justify-end" style={{background: 'linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(255,255,255,0.6) 55%, rgba(255,255,255,0.97) 75%)'}}>
                  <div className="p-12 text-center bg-white border-t border-slate-100">
                    <h4 className="text-xl font-black mb-2">Upgrade to Pro</h4>
                    <p className="text-slate-500 text-sm mb-6">You've used your daily trials. Get lifetime access to all exporters.</p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Early Bird Price</p>
                        <p className="text-2xl font-black">$9 <span className="text-xs text-slate-400 font-medium">/ lifetime</span></p>
                      </div>
                      <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all">Unlock All</a>
                    </div>
                  </div>
                </div>
              )}
              {jsonData && (
                <div className="absolute bottom-6 right-6 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xl max-h-48 overflow-y-auto no-scrollbar hidden lg:block">
                  <JsonVisualizer data={jsonData} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-[#0F172A] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700"
          >
            {toast.type === 'success' ? <CheckCircle2 className="text-green-400" size={18} /> : <Terminal className="text-blue-400" size={18} />}
            <span className="text-sm font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
