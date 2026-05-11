'use client';
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Code2, Zap, ShieldCheck, Loader2, Wand2 } from 'lucide-react';

interface LogicLabViewProps {
  isDark: boolean;
  geminiKey: string;
}

export function LogicLabView({ isDark, geminiKey }: LogicLabViewProps) {
  const [sourceCode, setSourceCode] = useState(`// Paste legacy code or logic here\nfunction getData(callback) {\n  fetch('https://api.example.com/data')\n    .then(function(res) {\n      return res.json();\n    })\n    .then(function(data) {\n      callback(null, data);\n    })\n    .catch(function(err) {\n      callback(err);\n    });\n}`);
  const [outputCode, setOutputCode] = useState('');
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [targetLang, setTargetLang] = useState('typescript');

  const handleRefactor = async () => {
    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top bar to use Logic Lab.");
      return;
    }
    
    setIsRefactoring(true);
    try {
      const prompt = `
        You are a Senior Principal Engineer. Refactor the following code to ${targetLang}.
        Requirements:
        1. Use the most modern best practices (ESNext, Modern Hooks, etc.).
        2. Ensure high type safety if targeting TypeScript.
        3. Keep the logic identical but improve readability and performance.
        4. Return ONLY the code block, no explanations.
        
        CODE TO REFACTOR:
        ${sourceCode}
      `;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const data = await res.json();
      const refactored = data.candidates[0].content.parts[0].text.replace(/```[a-z]*\n/g, '').replace(/```/g, '');
      setOutputCode(refactored);
    } catch (e) {
      console.error(e);
      setOutputCode("// Refactoring failed. Please check your API key and connection.");
    } finally {
      setIsRefactoring(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      {/* Header */}
      <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-3">
              <Sparkles size={12} /> AI Experimental Lab
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Smart Logic Refactor</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Transform legacy logic into modern, type-safe code using AI.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            {['typescript', 'javascript', 'rust', 'go'].map((lang) => (
              <button
                key={lang}
                onClick={() => setTargetLang(lang)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${targetLang === lang ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Input Panel */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden group">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-slate-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Source Logic</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                theme={isDark ? "vs-dark" : "light"}
                defaultLanguage="javascript"
                value={sourceCode}
                onChange={(v) => setSourceCode(v || "")}
                options={{ 
                  minimap: { enabled: false }, 
                  fontSize: 14, 
                  fontFamily: 'var(--font-jetbrains-mono)',
                  padding: { top: 24, bottom: 24 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true 
                }}
              />
            </div>
          </div>

          {/* Output Panel */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-blue-500" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Refactored Output ({targetLang})</span>
              </div>
              {outputCode && (
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(outputCode);
                    alert("Copied to clipboard!");
                  }}
                  className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Copy Code
                </button>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                theme={isDark ? "vs-dark" : "light"}
                language={targetLang === 'typescript' ? 'typescript' : targetLang === 'rust' ? 'rust' : targetLang === 'go' ? 'go' : 'javascript'}
                value={outputCode || "// Click 'Start AI Refactor' to transform your logic"}
                options={{ 
                  minimap: { enabled: false }, 
                  fontSize: 14, 
                  fontFamily: 'var(--font-jetbrains-mono)',
                  readOnly: true,
                  padding: { top: 24, bottom: 24 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true 
                }}
              />
            </div>

            {/* Float Action Button */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
              <button
                onClick={handleRefactor}
                disabled={isRefactoring}
                className="group px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3 disabled:opacity-50 overflow-hidden"
              >
                {isRefactoring ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Analyzing Logic...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>Start AI Refactor</span>
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-slate-50 dark:bg-[#020617] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center gap-6 text-slate-400">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={14} className="text-green-500" />
            Local Proxy Processing
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            <Zap size={14} className="text-yellow-500" />
            Gemini 1.5 Pro Enabled
          </div>
        </div>
      </div>
    </div>
  );
}
