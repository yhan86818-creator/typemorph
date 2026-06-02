import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Settings, Wand2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { callGeminiWithRetry } from '@/lib/gemini';

export function SmartDiffView({ geminiKey, setGeminiKey, isPro, trialCount, setTrialCount, isDark }: { geminiKey: string, setGeminiKey: (k: string) => void, isPro: boolean, trialCount: number, setTrialCount: (c: number) => void, isDark: boolean }) {
  const [jsonA, setJsonA] = useState('{\n  "id": 101,\n  "user": "jdoe",\n  "status": "active"\n}');
  const [jsonB, setJsonB] = useState('{\n  "id": 101,\n  "username": "jdoe",\n  "status": "pending",\n  "tags": ["beta"]\n}');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [schemaType, setSchemaType] = useState('zod');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleMerge = async () => {
    if (!isPro && trialCount <= 0) {
      setError('Free trial limit reached. Please activate a Pro license to continue using Advanced AI features.');
      return;
    }
    if (!geminiKey) {
      setError('Please set your Gemini API Key in the top navigation first.');
      return;
    }
    
    setIsAnalyzing(true);
    setError('');
    setResult('');

    try {
      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typeflow_trial_count', newCount.toString());
      }
      const prompt = `You are an expert developer. Analyze these two JSON payloads (A and B).
      Generate a single unified ${schemaType === 'zod' ? 'Zod Schema (const schema = z.object(...))' : 'TypeScript Interface'} that can safely handle both formats.
      Make fields optional if they appear in one but not the other.
      Return ONLY the raw code block without markdown formatting or backticks. Do not include explanations.

      --- JSON A ---
      ${jsonA}

      --- JSON B ---
      ${jsonB}
      `;

      let resultText = await callGeminiWithRetry(geminiKey, prompt, 0.1);
      resultText = resultText.replace(/^```(typescript|ts|javascript|js)?\n/i, '').replace(/\n```$/i, '').trim();
      
      setResult(resultText);
    } catch (err: any) {
      setError(err.message || 'Failed to generate schema.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isAnalyzing) {
          handleMerge();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMerge, isAnalyzing]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto pt-32 pb-20 px-6 min-h-screen"
    >
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white">
          Smart JSON Diff <span className="text-blue-600">AI</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          Compare structures and instantly generate perfectly merged Zod schemas or TypeScript interfaces using Gemini AI. 100% Local-first privacy.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle size={20} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Original JSON (A)</span>
            </div>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={jsonA}
            onChange={(v) => setJsonA(v || '')}
            theme={isDark ? "vs-dark" : "light"}
            options={{ 
              minimap: { enabled: false }, 
              fontSize: 13, 
              scrollBeyondLastLine: false, 
              padding: { top: 16, bottom: 16 },
              automaticLayout: true,
              wordWrap: 'on',
              scrollbar: { vertical: 'auto', horizontal: 'auto' }
            }}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Modified JSON (B)</span>
            </div>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={jsonB}
            onChange={(v) => setJsonB(v || '')}
            theme={isDark ? "vs-dark" : "light"}
            options={{ 
              minimap: { enabled: false }, 
              fontSize: 13, 
              scrollBeyondLastLine: false, 
              padding: { top: 16, bottom: 16 },
              automaticLayout: true,
              wordWrap: 'on',
              scrollbar: { vertical: 'auto', horizontal: 'auto' }
            }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-sm">
          <select 
            value={schemaType} 
            onChange={(e) => setSchemaType(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none px-4 py-2 cursor-pointer"
          >
            <option value="zod">Zod Schema</option>
            <option value="typescript">TypeScript Interface</option>
          </select>
        </div>
        
        <button 
          onClick={handleMerge}
          disabled={isAnalyzing}
          className="group relative px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 flex items-center gap-3 overflow-hidden"
          title="Press Cmd+Enter or Ctrl+Enter"
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2"><ArrowLeftRight className="animate-spin" size={18} /> Analyzing...</span>
          ) : (
            <span className="flex items-center gap-2"><Wand2 size={18} /> AI Merge Schema <span className="text-[10px] opacity-50 ml-2 border border-current px-1.5 py-0.5 rounded">⌘↵</span></span>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      </div>

      {result && (
        <div className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Generated {schemaType === 'zod' ? 'Zod' : 'TypeScript'}</span>
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors"
            >
              {copied ? <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <div className="h-[400px]">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              value={result}
              theme={isDark ? "vs-dark" : "light"}
              options={{ 
                minimap: { enabled: false }, 
                fontSize: 13, 
                scrollBeyondLastLine: false, 
                padding: { top: 16, bottom: 16 }, 
                readOnly: true,
                automaticLayout: true,
                wordWrap: 'on',
                scrollbar: { vertical: 'auto', horizontal: 'auto' }
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
