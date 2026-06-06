'use client';

import { trackProClick } from '@/lib/analytics';
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Loader2, Copy, Check, Crown, Terminal, 
  Settings2, ShieldCheck, Database, Layout, Server, Type, FileCode2, Download, Wand2, Paintbrush, Play
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Sandpack } from "@codesandbox/sandpack-react";

interface FullStackArchitectViewProps {
  isDark: boolean;
  geminiKey: string;
  isPro: boolean;
  trialCount: number;
  setTrialCount: (count: number) => void;
}

type GenerationMode = 'fullstack' | 'admin-ui';

const FULLSTACK_TABS = [
  { id: 'types', label: 'Types', icon: <Type size={14} />, language: 'typescript' },
  { id: 'validation', label: 'Zod', icon: <ShieldCheck size={14} />, language: 'typescript' },
  { id: 'db', label: 'Prisma', icon: <Database size={14} />, language: 'prisma' },
  { id: 'backend', label: 'API Route', icon: <Server size={14} />, language: 'typescript' },
  { id: 'frontend', label: 'React Hook', icon: <Layout size={14} />, language: 'typescript' },
];

const ADMIN_UI_TABS = [
  { id: 'preview', label: 'Live Preview', icon: <Play size={14} />, language: 'preview' },
  { id: 'dashboard', label: 'Dashboard', icon: <Layout size={14} />, language: 'typescript' },
  { id: 'table', label: 'Table List', icon: <Database size={14} />, language: 'typescript' },
  { id: 'form', label: 'Edit Form', icon: <FileCode2 size={14} />, language: 'typescript' },
  { id: 'api_hook', label: 'API Hook', icon: <Server size={14} />, language: 'typescript' },
];

export function FullStackArchitectView({ isDark, geminiKey, isPro, trialCount, setTrialCount }: FullStackArchitectViewProps) {
  const [mode, setMode] = useState<GenerationMode>('fullstack');
  const [input, setInput] = useState(`// Describe your entity or paste a JSON/SQL payload
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}`);

  const [output, setOutput] = useState<{ [key: string]: string }>({});
  
  const currentTabs = mode === 'fullstack' ? FULLSTACK_TABS : ADMIN_UI_TABS;
  const [activeTab, setActiveTab] = useState(currentTabs[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Reset tab when mode changes
  useEffect(() => {
    setTimeout(() => setActiveTab(currentTabs[0].id), 0);
  }, [mode]);

  const processArchitecture = async () => {
    if (!isPro && trialCount <= 0) {
      setShowPaywall(true);
      return;
    }

    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top navigation to use the Full-Stack Architect.");
      return;
    }

    setIsProcessing(true);
    try {
      const fullstackPrompt = `
        You are an elite Staff Software Engineer. Generate a full-stack architecture based on the input.
        INPUT:
        ${input}
        
        CRITICAL FORMATTING INSTRUCTIONS:
        You MUST output the code using exactly the following block format. Do NOT use JSON.
        
        [BLOCK: types]
        (TypeScript code here)
        [/BLOCK]
        
        [BLOCK: validation]
        (Zod code here)
        [/BLOCK]
        
        [BLOCK: db]
        (Prisma code here)
        [/BLOCK]
        
        [BLOCK: backend]
        (Backend code here)
        [/BLOCK]
        
        [BLOCK: frontend]
        (Frontend code here)
        [/BLOCK]
      `;

      const adminUiPrompt = `
        You are an elite Frontend Engineer specialized in React and Tailwind CSS.
        Generate a beautiful Admin UI Dashboard based on the input schema/data.
        Use Lucide-react for icons, and modern Tailwind CSS (glassmorphism, clean borders).
        INPUT:
        ${input}
        
        CRITICAL IMPORT RULES FOR SANDPACK PREVIEW:
        1. In the "dashboard" code, you MUST import the table exactly like this: import DataTable from './components/DataTable';
        2. In the "dashboard" code, you MUST import the form exactly like this: import DataForm from './components/DataForm';
        3. In the "dashboard", "table", or "form" code, import the hook exactly like this: import { useAdminData } from './hooks/useAdminData';
        4. The "table" code MUST export the component as: export default function DataTable
        5. The "form" code MUST export the component as: export default function DataForm

        CRITICAL FORMATTING INSTRUCTIONS:
        You MUST output the code using exactly the following block format. Do NOT use JSON.

        [BLOCK: dashboard]
        (Main App.tsx layout here)
        [/BLOCK]

        [BLOCK: table]
        (DataTable.tsx code here)
        [/BLOCK]

        [BLOCK: form]
        (DataForm.tsx code here)
        [/BLOCK]

        [BLOCK: api_hook]
        (useAdminData.ts code here)
        [/BLOCK]
      `;

      const prompt = mode === 'fullstack' ? fullstackPrompt : adminUiPrompt;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error(data.error?.message || "Invalid API Response or Key.");
      }
      
      const resultText = data.candidates[0].content.parts[0].text;
      
      const extractBlock = (text: string, blockName: string) => {
        const regex = new RegExp(`\\[BLOCK:\\s*${blockName}\\]([\\s\\S]*?)\\[\\/BLOCK\\]`, 'i');
        const match = text.match(regex);
        if (match && match[1]) {
          let content = match[1].trim();
          if (content.startsWith('\`\`\`')) {
            content = content.replace(/^\`\`\`[a-z]*\\n/, '').replace(/\\n\`\`\`$/, '');
          }
          return content.trim();
        }
        return '// Error: Failed to generate or parse this block';
      };
        
      if (mode === 'fullstack') {
        setOutput({
          types: extractBlock(resultText, 'types'),
          validation: extractBlock(resultText, 'validation'),
          db: extractBlock(resultText, 'db'),
          backend: extractBlock(resultText, 'backend'),
          frontend: extractBlock(resultText, 'frontend')
        });
      } else {
        setOutput({
          dashboard: extractBlock(resultText, 'dashboard'),
          table: extractBlock(resultText, 'table'),
          form: extractBlock(resultText, 'form'),
          api_hook: extractBlock(resultText, 'api_hook')
        });
      }

      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typemorph_trial_count', String(newCount));
      }
    } catch (err: any) {
      console.error('Architect Error:', err);
      const errorMsg = err.message || "Unknown error";
      const errState = `// Error: ${errorMsg}`;
      const fallback = currentTabs.reduce((acc, tab) => {
        acc[tab.id] = errState;
        return acc;
      }, {} as { [key: string]: string });
      setOutput(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadBoilerplate = async () => {
    if (Object.keys(output).length === 0) return;
    
    const zip = new JSZip();
    
    zip.file('package.json', JSON.stringify({
      "name": "typemorph-micro-saas",
      "version": "1.0.0",
      "private": true,
      "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
      "dependencies": {
        "next": "latest",
        "react": "latest",
        "react-dom": "latest",
        "zod": "latest",
        "lucide-react": "latest",
        "@prisma/client": "latest",
        "@tanstack/react-query": "latest"
      },
      "devDependencies": {
        "prisma": "latest",
        "tailwindcss": "latest",
        "typescript": "latest",
        "@types/node": "latest",
        "@types/react": "latest"
      }
    }, null, 2));
    
    const src = zip.folder('src');
    if (src) {
      if (mode === 'fullstack') {
        if (output.types) src.file('types/index.ts', output.types);
        if (output.validation) src.file('lib/validations.ts', output.validation);
        if (output.frontend) src.file('hooks/useData.ts', output.frontend);
        const app = src.folder('app');
        if (app && output.backend) app.file('api/route.ts', output.backend);
      } else {
        const app = src.folder('app');
        if (app && output.dashboard) app.file('page.tsx', output.dashboard);
        const components = src.folder('components');
        if (components) {
          if (output.table) components.file('DataTable.tsx', output.table);
          if (output.form) components.file('DataForm.tsx', output.form);
        }
        if (output.api_hook) src.file('hooks/useAdminData.ts', output.api_hook);
      }
    }
    
    if (mode === 'fullstack') {
      const prisma = zip.folder('prisma');
      if (prisma && output.db) {
        prisma.file('schema.prisma', output.db);
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, mode === 'fullstack' ? 'typemorph-micro-saas.zip' : 'typemorph-admin-ui.zip');
  };

  const copyToClipboard = () => {
    if (!output[activeTab]) return;
    navigator.clipboard.writeText(output[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTabData = currentTabs.find(t => t.id === activeTab) || currentTabs[0];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 relative overflow-hidden">
      {/* Aesthetic Background */}
      <div className={`absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${mode === 'fullstack' ? 'bg-emerald-600/5' : 'bg-fuchsia-600/5'}`} />

      {/* Paywall */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-emerald-500/40">
                <Crown size={40} />
              </div>
              <h2 className="text-3xl font-black mb-4 dark:text-white">Architect Access Limited</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                Agentic generation requires massive neural tokens. Upgrade to Pro for unlimited sessions.
              </p>
              <div className="space-y-4">
                <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" rel="noopener noreferrer" onClick={() => trackProClick('architect_paywall')} className="block w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Get Pro Access</a>
                <button onClick={() => setShowPaywall(false)} className="block w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors">I&apos;ll wait</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Cockpit */}
      <div className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl z-10 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors duration-500 ${mode === 'fullstack' ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-500/20' : 'bg-gradient-to-br from-fuchsia-600 to-purple-600 shadow-fuchsia-500/20'}`}>
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                FULL-STACK ARCHITECT 
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-colors ${mode === 'fullstack' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400'}`}>Magic</span>
              </h1>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Agentic Codebase Generation</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

          {/* Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setMode('fullstack')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${mode === 'fullstack' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Database size={12} /> Full-Stack API
            </button>
            <button
              onClick={() => setMode('admin-ui')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${mode === 'admin-ui' ? 'bg-white dark:bg-slate-800 text-fuchsia-600 dark:text-fuchsia-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Paintbrush size={12} /> Admin UI
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isPro && (
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">{trialCount} Generations</div>
          )}
          
          <button
            onClick={downloadBoilerplate}
            disabled={Object.keys(output).length === 0 || isProcessing || (output[currentTabs[0].id] || '').startsWith('// Failed')}
            title="Download Full Stack App (.zip)"
            className="px-4 py-3 bg-slate-800 dark:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            <Download size={16} />
            <span className="hidden md:inline">Export ZIP</span>
          </button>

          <button
            onClick={() => processArchitecture()}
            disabled={isProcessing}
            title="Ctrl + Enter to Execute"
            className={`px-8 py-3 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2 ${mode === 'fullstack' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-fuchsia-600 shadow-fuchsia-600/20'}`}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
            <span>Generate Code</span>
            <span className="text-[8px] opacity-60 border border-current px-1 py-0.5 rounded ml-1 tracking-tighter">Ctrl+↵</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Workspace - Source */}
        <div className="flex-1 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payload / Requirements</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              theme={isDark ? "vs-dark" : "light"}
              language="sql"
              value={input}
              onChange={(v) => setInput(v || "")}
              onMount={(editor, monaco) => {
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  processArchitecture();
                });
              }}
              options={{ 
                minimap: { enabled: false }, 
                fontSize: 13, 
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 16, bottom: 16 },
                automaticLayout: true,
                lineNumbers: 'on',
                renderLineHighlight: 'none',
                scrollbar: { vertical: 'auto', horizontal: 'auto' },
                wordWrap: 'on'
              }}
            />
          </div>
        </div>
 
        {/* Workspace - Generated Layers */}
        <div className="flex-1 bg-slate-50 dark:bg-[#020617] flex flex-col relative">
          <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col backdrop-blur-md">
            
            {/* Tabs */}
            <div className="flex items-center overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 px-2 pt-2">
              {currentTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                    activeTab === tab.id 
                      ? (mode === 'fullstack' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400') 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 size={14} className={mode === 'fullstack' ? 'text-emerald-500' : 'text-fuchsia-500'} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${mode === 'fullstack' ? 'text-emerald-600' : 'text-fuchsia-600'}`}>Generated: {activeTabData.label}</span>
              </div>
              <AnimatePresence>
                {output[activeTab] && (
                  <motion.button 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm transition-all duration-300 ${
                      copied 
                        ? (mode === 'fullstack' ? 'bg-emerald-600 text-white shadow-emerald-500/20 animate-pulse' : 'bg-fuchsia-600 text-white shadow-fuchsia-500/20 animate-pulse') 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {copied ? <Check size={14} className="text-white animate-bounce" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            {activeTab === 'preview' && mode === 'admin-ui' && Object.keys(output).length > 0 ? (
              <div className="h-full w-full custom-sandpack-wrapper">
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-sandpack-wrapper .sp-layout {
                    height: 100% !important;
                    border: none !important;
                    background: transparent !important;
                    border-radius: 0 !important;
                  }
                  .custom-sandpack-wrapper .sp-stack {
                    height: 100% !important;
                  }
                `}} />
                <Sandpack 
                  theme={isDark ? "dark" : "light"}
                  template="react-ts"
                  customSetup={{
                    dependencies: {
                      "lucide-react": "latest",
                      "clsx": "latest",
                      "tailwind-merge": "latest"
                    }
                  }}
                  files={{
                    "/App.tsx": output.dashboard?.startsWith("// Error") ? "export default function App() { return <div className='p-8 text-red-500 font-bold'>Error generating code. Please try again.</div> }" : (output.dashboard || "export default function App() { return <div className='p-8 text-slate-500'>No Dashboard Generated</div> }"),
                    "/components/DataTable.tsx": output.table?.startsWith("// Error") ? "export default function DataTable() { return null }" : (output.table || "export default function DataTable() { return null }"),
                    "/components/DataForm.tsx": output.form?.startsWith("// Error") ? "export default function DataForm() { return null }" : (output.form || "export default function DataForm() { return null }"),
                    "/hooks/useAdminData.ts": output.api_hook?.startsWith("// Error") ? "export const useAdminData = () => []" : (output.api_hook || "export const useAdminData = () => []"),
                    "/public/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TypeMorph Live Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { margin: 0; padding: 0; background: ${isDark ? '#020617' : '#f8fafc'}; color: ${isDark ? '#fff' : '#0f172a'}; font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
                  }}
                  options={{
                    showNavigator: false,
                    showTabs: false,
                    editorHeight: "100%",
                  }}
                />
              </div>
            ) : (
              <Editor
                height="100%"
                theme={isDark ? "vs-dark" : "light"}
                language={activeTabData.language}
                value={output[activeTab] || ''}
                options={{ 
                  readOnly: true,
                  minimap: { enabled: false }, 
                  fontSize: 13, 
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 16, bottom: 16 },
                  automaticLayout: true,
                  renderLineHighlight: 'none',
                  scrollbar: { vertical: 'auto', horizontal: 'auto' },
                  wordWrap: 'on'
                }}
              />
            )}
            {Object.keys(output).length === 0 && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center opacity-20">
                  <Layout size={64} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Awaiting Architecture</p>
                </div>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="text-center">
                  <Loader2 size={40} className={`animate-spin mx-auto mb-4 ${mode === 'fullstack' ? 'text-emerald-600' : 'text-fuchsia-600'}`} />
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${mode === 'fullstack' ? 'text-emerald-600' : 'text-fuchsia-600'}`}>Generating {mode === 'fullstack' ? 'Full Stack' : 'Admin UI'}...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lab Status */}
      <div className="h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] px-8 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Settings2 size={12} className={mode === 'fullstack' ? 'text-emerald-500' : 'text-fuchsia-500'} />
            Agentic AI Active
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className={mode === 'fullstack' ? 'text-emerald-500' : 'text-fuchsia-500'} />
            100% {mode === 'fullstack' ? 'Schema Accuracy' : 'React Beautiful UI'}
          </div>
        </div>
        <div className="text-slate-300">TypeMorph Architect Engine v2.0</div>
      </div>
    </div>
  );
}
