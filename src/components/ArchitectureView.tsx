'use client';
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, Layers, Share, Wand2, Loader2, Maximize2, ZoomIn, Crown, ShieldAlert } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'var(--font-jetbrains-mono)',
});

interface ArchitectureViewProps {
  isDark: boolean;
  geminiKey: string;
  isPro: boolean;
  trialCount: number;
  setTrialCount: (count: number) => void;
}

export function ArchitectureView({ isDark, geminiKey, isPro, trialCount, setTrialCount }: ArchitectureViewProps) {
  const [input, setInput] = useState(`CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  content TEXT
);`);
  const [mermaidCode, setMermaidCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [svg, setSvg] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const generateDiagram = async () => {
    if (!isPro && trialCount <= 0) {
      setShowPaywall(true);
      return;
    }

    if (!geminiKey) {
      alert("Please enter your Gemini API Key to use AI Visualization.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `
        Transform the following input into a valid Mermaid.js diagram code.
        If it is SQL, generate an Entity Relationship (ER) Diagram (erDiagram).
        If it is JSON, generate a Class Diagram (classDiagram) showing the structure.
        Only output the raw mermaid code, no markdown, no explanations.
        
        INPUT:
        ${input}
      `;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const data = await res.json();
      let code = data.candidates[0].content.parts[0].text.replace(/```mermaid\n/g, '').replace(/```/g, '').trim();
      
      // Basic cleanup for erDiagram common issues
      if (code.startsWith('erDiagram')) {
        code = code.replace(/\"/g, '');
      }
      
      setMermaidCode(code);
      
      // Decrement trial
      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typeflow_trial_count', String(newCount));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (mermaidCode) {
      const render = async () => {
        try {
          const { svg } = await mermaid.render('mermaid-svg', mermaidCode);
          setSvg(svg);
        } catch (e) {
          console.error("Mermaid Render Error", e);
          setSvg('<div className="p-8 text-red-500 font-bold">Failed to render diagram. Please check the AI output.</div>');
        }
      };
      render();
    }
  }, [mermaidCode]);

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
                You've used all your free trials for Visual Architecture. Upgrade to Pro for unlimited AI diagrams and advanced logic tools.
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
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Visual Architecture</h1>
                {!isPro && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900">Pro Feature</span>
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ER Diagrams & Data Structures</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isPro && (
              <div className="mr-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{trialCount} Free Credits Left</div>
            )}
            <button
              onClick={generateDiagram}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
              Generate Diagram
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Editor
            height="100%"
            theme={isDark ? "vs-dark" : "light"}
            language="sql"
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

        {/* Visual Area */}
        <div className="flex-1 bg-slate-50 dark:bg-[#020617] relative p-12 overflow-auto flex items-center justify-center min-h-0">
          <AnimatePresence mode="wait">
            {svg ? (
              <motion.div
                key="diagram"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-full overflow-auto"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-6 mx-auto text-slate-300">
                  <Layers size={40} />
                </div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Paste SQL/JSON and click generate</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tools Overlay */}
          {svg && (
            <div className="absolute top-10 right-10 flex flex-col gap-2">
              <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                <Maximize2 size={18} />
              </button>
              <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                <ZoomIn size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] flex items-center justify-between px-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Mermaid Engine Active
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> AI Diagram Synthesis
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-300">TYPEFLOW PRO ARCHITECTURE v1.0</div>
      </div>
    </div>
  );
}
