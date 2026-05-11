'use client';
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, ArrowRight, Zap, Loader2, Save, Copy, Check, Crown } from 'lucide-react';

interface LogicLabViewProps {
  isDark: boolean;
  geminiKey: string;
  isPro: boolean;
  trialCount: number;
  setTrialCount: (count: number) => void;
}

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

  const processLogic = async () => {
    if (!isPro && trialCount <= 0) {
      setShowPaywall(true);
      return;
    }

    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top navigation to use AI features.");
      return;
    }

    setIsProcessing(true);
    try {
      const prompt = `
        You are an expert software architect. 
        Analyze the following code and refactor it into clean, modern, high-performance code.
        Focus on:
        - Modern patterns (ESNext, TypeScript, Hooks, etc.)
        - Type safety
        - Performance optimization
        - Readability
        
        INPUT CODE:
        ${input}
        
        Respond ONLY with the refactored code. No markdown code blocks, just the raw code.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const result = data.candidates[0].content.parts[0].text.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
      setOutput(result);

      // Decrement trial
      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typeflow_trial_count', String(newCount));
      }
    } catch (err) {
      console.error(err);
      setOutput("// AI Refactoring Error. Please check your API key and connection.");
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
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 relative">
      {/* Paywall Overlay */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-[#0F172A]/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-amber-600">
                <Crown size={40} />
              </div>
              <h2 className="text-3xl font-black mb-4 dark:text-white">Pro Feature</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                You've used all your free trials for Smart Logic Lab. Upgrade to Pro for unlimited AI refactoring and advanced architecture tools.
              </p>
              <div className="space-y-4">
                <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" className="block w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Upgrade to Pro</a>
                <button onClick={() => setShowPaywall(false)} className="block w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors">I'll do it later</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617]/50 backdrop-blur-xl shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-purple-600 rounded-2xl shadow-lg shadow-purple-500/20">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Smart Logic Lab</h1>
                {!isPro && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900">Pro Feature</span>
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI-Powered Logic Refactoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {!isPro && (
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{trialCount} Free Credits Left</div>
            )}
            <button
              onClick={processLogic}
              disabled={isProcessing}
              className="px-8 py-3 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
              Refactor Logic
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Input Editor */}
        <div className="flex-1 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input (Legacy / Raw)</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              theme={isDark ? "vs-dark" : "light"}
              language="javascript"
              value={input}
              onChange={(v) => setInput(v || "")}
              options={{ 
                minimap: { enabled: false }, 
                fontSize: 13, 
                fontFamily: 'var(--font-jetbrains-mono)',
                padding: { top: 24, bottom: 24 },
                automaticLayout: true 
              }}
            />
          </div>
        </div>

        {/* Output Area */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Refactored Output</span>
            {output && (
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-purple-600 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              theme={isDark ? "vs-dark" : "light"}
              language="typescript"
              value={output}
              options={{ 
                readOnly: true,
                minimap: { enabled: false }, 
                fontSize: 13, 
                fontFamily: 'var(--font-jetbrains-mono)',
                padding: { top: 24, bottom: 24 },
                automaticLayout: true 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
