'use client';
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Wand2, ArrowRight, Zap, Loader2, Save, 
  Copy, Check, Crown, FlaskConical, Beaker, Terminal, 
  Settings2, ShieldCheck, Microscope, History
} from 'lucide-react';

interface LogicLabViewProps {
  isDark: boolean;
  geminiKey: string;
  isPro: boolean;
  trialCount: number;
  setTrialCount: (count: number) => void;
}

const PRESETS = [
  { id: 'refactor', label: 'Clean Refactor', icon: <Wand2 size={14} />, prompt: 'Refactor into clean, modern TypeScript following SOLID principles.' },
  { id: 'tests', label: 'Gen Vitest', icon: <ShieldCheck size={14} />, prompt: 'Generate comprehensive Vitest unit tests for this code.' },
  { id: 'perf', label: 'Optimize Perf', icon: <Zap size={14} />, prompt: 'Optimize this code for maximum performance and memory efficiency.' },
  { id: 'docs', label: 'Add JSDoc', icon: <History size={14} />, prompt: 'Add detailed JSDoc comments and explain the architecture.' },
  { 
    id: 'nextjs-api', 
    label: 'Prisma ➡ Next.js API', 
    icon: <Sparkles size={14} className="text-blue-600" />, 
    prompt: 'Generate highly optimized, production-ready Next.js 15/16 App Router API routes (GET, POST, PUT, DELETE) utilizing Prisma Client for this Prisma Schema or model definition. CRITICAL: For dynamic routes like [userId] or [postId], implement Next.js 15/16 asynchronous params: define parameter types as Promise<{ userId: string }> and perform `const { userId } = await params;` to prevent runtime errors. Implement robust input validation, Prisma transactions, correct relational query includes, strict error handling with appropriate HTTP status codes, and return beautifully structured JSON responses. Output ONLY the Next.js API route code with clear directory layout comments.' 
  }
];

export function LogicLabView({ isDark, geminiKey, isPro, trialCount, setTrialCount }: LogicLabViewProps) {
  const [input, setInput] = useState(`// Legacy JavaScript to Modern TypeScript
function fetchUsers(callback) {
  $.ajax({
    url: '/api/users',
    success: function(data) {
      callback(null, data);
    },
    error: function(err) {
      callback(err);
    }
  });
}`);
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activePreset, setActivePreset] = useState('refactor');

  // Initial Magic Data Handling
  useEffect(() => {
    const magicData = localStorage.getItem('typeflow_magic_data');
    if (magicData) {
      setInput(magicData);
      localStorage.removeItem('typeflow_magic_data');
      if (geminiKey && (isPro || trialCount > 0)) {
        setTimeout(() => processLogic(), 500);
      }
    }
  }, [geminiKey, isPro]);

  // Sync sample inputs when switching presets to guide users
  useEffect(() => {
    const samples: any = {
      refactor: `// Legacy JavaScript to Modern TypeScript\nfunction fetchUsers(callback) {\n  $.ajax({\n    url: '/api/users',\n    success: function(data) {\n      callback(null, data);\n    },\n    error: function(err) {\n      callback(err);\n    }\n  });\n}`,
      tests: `// Add Tests for this Math utility\nexport function calculateDiscount(price: number, discount: number, member: boolean) {\n  if (price < 0) return 0;\n  let rate = discount;\n  if (member) rate += 0.1;\n  return price * (1 - Math.min(rate, 0.9));\n}`,
      perf: `// Optimize this nested loop and memoization bottleneck\nexport function fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}`,
      docs: `// Add JSDoc to this Auth Handler\nexport async function handleSession(req: Request, db: any) {\n  const token = req.headers.get('Authorization')?.split(' ')[1];\n  if (!token) return { status: 401, error: 'Unauthorized' };\n  const user = await db.user.findFirst({ where: { token } });\n  return { status: 200, user };\n}`,
      'nextjs-api': `// Prisma Schema: User & Post relationship\nmodel User {\n  id        String   @id @default(uuid())\n  email     String   @unique\n  name      String?\n  role      Role     @default(USER)\n  posts     Post[]\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n\nmodel Post {\n  id        String   @id @default(uuid())\n  title     String\n  content   String?\n  published Boolean  @default(false)\n  authorId  String\n  author    User     @relation(fields: [authorId], references: [id])\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n\nenum Role {\n  USER\n  ADMIN\n}`
    };

    if (samples[activePreset]) {
      setInput(samples[activePreset]);
    }
  }, [activePreset]);

  const processLogic = async (customPrompt?: string) => {
    if (!isPro && trialCount <= 0) {
      setShowPaywall(true);
      return;
    }

    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top navigation to use the Logic Lab.");
      return;
    }

    setIsProcessing(true);
    try {
      const selectedPreset = PRESETS.find(p => p.id === activePreset);
      const prompt = `
        You are a principal staff engineer at a top-tier tech company. 
        TASK: ${customPrompt || selectedPreset?.prompt}
        
        Rules:
        1. Ensure strict type safety and modern best practices.
        2. Keep the output clean and production-ready.
        3. Respond ONLY with the code. No markdown backticks, no explanations outside of code comments.
        
        INPUT CODE:
        ${input}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (!data.candidates || data.candidates.length === 0) {
        if (data.promptFeedback?.blockReason) {
          throw new Error(`AI blocked this content: ${data.promptFeedback.blockReason}`);
        }
        throw new Error(data.error?.message || "Invalid API Response or Key.");
      }
      
      const result = data.candidates[0].content.parts[0].text
        .replace(/```[a-z]*\n/g, '')
        .replace(/```/g, '')
        .trim();
        
      setOutput(result);

      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typeflow_trial_count', String(newCount));
      }
    } catch (err: any) {
      console.error('LogicLab Error:', err);
      const errorMsg = err.message || "Unknown error";
      setOutput(`// Error: ${errorMsg}\n// 1. Check if your Gemini API Key starts with 'AIza'.\n// 2. Ensure you have an internet connection.\n// 3. The code might be too long or triggered a safety filter.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 relative overflow-hidden">
      {/* Aesthetic Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

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
              <div className="w-20 h-20 bg-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-purple-500/40">
                <Crown size={40} />
              </div>
              <h2 className="text-3xl font-black mb-4 dark:text-white">Lab Access Limited</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                Smart refactoring requires high-density neural processing. Upgrade to Pro for unlimited Lab sessions.
              </p>
              <div className="space-y-4">
                <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" className="block w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Get Pro Access</a>
                <button onClick={() => setShowPaywall(false)} className="block w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors">I'll wait</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Cockpit */}
      <div className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl z-10 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <FlaskConical size={22} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                SMART LOGIC LAB 
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-md text-[8px] font-black uppercase">Alpha</span>
              </h1>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Advanced Neural Code Synthesis</p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePreset(p.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activePreset === p.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-900/50'}`}
              >
                {p.icon} <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isPro && (
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">{trialCount} Lab Credits</div>
          )}
          <button
            onClick={() => processLogic()}
            disabled={isProcessing}
            title="Ctrl + Enter to Execute Synthesis"
            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Microscope size={16} />}
            <span>Execute Synthesis</span>
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
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source Fragment</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              theme={isDark ? "vs-dark" : "light"}
              language={activePreset === 'nextjs-api' ? 'prisma' : 'typescript'}
              value={input}
              onChange={(v) => setInput(v || "")}
              onMount={(editor, monaco) => {
                // Add Ctrl+Enter or Cmd+Enter trigger for AI Smart Parse
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  processLogic();
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
 
        {/* Workspace - Refined */}
        <div className="flex-1 bg-slate-50 dark:bg-[#020617] flex flex-col relative">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Refined Output</span>
            </div>
            <AnimatePresence>
              {output && (
                <motion.button 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={copyToClipboard}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm transition-all duration-300 ${
                    copied 
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse' 
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-purple-600'
                  }`}
                >
                  {copied ? <Check size={14} className="text-white animate-bounce" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              theme={isDark ? "vs-dark" : "light"}
              language="typescript"
              value={output}
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
            {!output && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center opacity-20">
                  <Beaker size={64} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Awaiting Synthesis</p>
                </div>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="text-center">
                  <Loader2 size={40} className="animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-600">Neural Processing...</p>
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
            <Settings2 size={12} className="text-purple-500" />
            Logic Presets Active
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-green-500" />
            Safe Sandbox Execution
          </div>
        </div>
        <div className="text-slate-300">TypeFlow Logic Engine v4.2</div>
      </div>
    </div>
  );
}

