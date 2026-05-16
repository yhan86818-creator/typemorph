'use client';
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Download, Layers, Wand2, Loader2, Maximize2, 
  ZoomIn, Crown, ShieldAlert, Sparkles, MousePointer2, 
  Box, GitBranch, RefreshCw, Eye, Code2
} from 'lucide-react';
import mermaid from 'mermaid';

// Initialize Mermaid with a premium look
const getMermaidConfig = (isDark: boolean) => ({
  startOnLoad: true,
  theme: (isDark ? 'dark' : 'default') as any,
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  themeVariables: isDark ? {
    primaryColor: '#3b82f6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#60a5fa',
    lineColor: '#6366f1',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#334155',
    clusterBkg: '#0f172a',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#1e293b',
  } : {
    primaryColor: '#2563eb',
    primaryTextColor: '#fff',
    primaryBorderColor: '#1d4ed8',
    lineColor: '#3b82f6',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#e2e8f0',
    mainBkg: '#ffffff',
    nodeBorder: '#cbd5e1',
    clusterBkg: '#f8fafc',
    titleColor: '#0f172a',
    edgeLabelBackground: '#ffffff',
  },
  themeCSS: `
    .node rect, .node circle, .node polygon, .node path { 
      stroke-width: 2px !important; 
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
    }
    .edgePath .path { 
      stroke-width: 2.5px !important; 
      stroke: ${isDark ? '#6366f1' : '#3b82f6'} !important;
      filter: drop-shadow(0 0 4px ${isDark ? 'rgba(99,102,241,0.6)' : 'rgba(59,130,246,0.4)'});
    }
    .marker { 
      fill: ${isDark ? '#6366f1' : '#3b82f6'} !important; 
      stroke: ${isDark ? '#6366f1' : '#3b82f6'} !important; 
    }
    .label foreignObject { overflow: visible; }
    .node .label { font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; }
    .cluster rect { fill-opacity: 0.4 !important; stroke-width: 2px !important; stroke-dasharray: 5,5; }
  `
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
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  content TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMP
);

CREATE TABLE comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  user_id UUID REFERENCES users(id),
  body TEXT
);`);
  
  const [mermaidCode, setMermaidCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [svg, setSvg] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [diagramType, setDiagramType] = useState('Autodetect');
  const [zoom, setZoom] = useState(1);
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Initial Magic Data Handling
  useEffect(() => {
    const magicData = localStorage.getItem('typeflow_magic_data');
    if (magicData) {
      setInput(magicData);
      localStorage.removeItem('typeflow_magic_data');
      if (geminiKey && (isPro || trialCount > 0)) {
        setTimeout(() => generateDiagram(), 500);
      }
    }
  }, [geminiKey, isPro]);

  const generateDiagram = async () => {
    if (!isPro && trialCount <= 0) {
      setShowPaywall(true);
      return;
    }

    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top cockpit to use AI Visualization.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `
        As an Elite Software Architect and System Designer, transform the following technical input into a high-fidelity, production-grade Mermaid.js diagram.
        
        CRITICAL ARCHITECTURAL RULES:
        1. DIAGRAM SELECTION:
           - DB Schema/DDL -> erDiagram (Focus on relations and PK/FK).
           - Code/Logic -> classDiagram (Focus on methods and inheritance).
           - Flow/Processes -> flowchart TD (Use proper nodes: [Rect] for steps, {Hex} for decisions).
           - Async/API -> sequenceDiagram (Focus on participants and timing).
           - Cloud/Infra -> flowchart LR with subgraphs for clusters.
        
        2. VISUAL STANDARDS:
           - Use UPPERCASE for Entity names.
           - For erDiagram: types must be simple (e.g. UUID, STRING, INT). No spaces.
           - For flowchart: Add descriptive labels to connectors (e.g. -->|on success|).
           - Group related entities using subgraphs where possible to show system boundaries.
        
        3. SYNTAX INTEGRITY:
           - Ensure erDiagram entities have the format: ENTITY { type name }
           - Ensure all blocks are closed. No markdown. Output ONLY the raw code.
        
        INPUT TO VISUALIZE:
        ${input}
      `;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const data = await res.json();
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Invalid API Response or Key.");
      }
      
      let code = data.candidates[0].content.parts[0].text
        .replace(/```mermaid\n/g, '')
        .replace(/```/g, '')
        .trim();
      
      if (code.startsWith('erDiagram')) {
        code = code.replace(/\"/g, ''); 
      }
      
      setMermaidCode(code);
      setActiveTab('visual');
      
      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typeflow_trial_count', String(newCount));
      }
    } catch (e: any) {
      console.error('ArchitectureView Error:', e);
      alert(`AI Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typeflow-arch-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    mermaid.initialize(getMermaidConfig(isDark) as any);
    
    if (mermaidCode) {
      const render = async () => {
        try {
          const { svg: renderedSvg } = await mermaid.render('mermaid-render-' + Math.random().toString(36).substr(2, 9), mermaidCode);
          setSvg(renderedSvg);
        } catch (e) {
          console.error("Mermaid Render Error", e);
        }
      };
      render();
    }
  }, [mermaidCode, isDark]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 relative overflow-hidden">
      {/* Visual Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* Paywall Overlay */}
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
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-blue-500/40">
                <Crown size={40} />
              </div>
              <h2 className="text-3xl font-black mb-4 dark:text-white">Pro Architect</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                Visualizing complex systems requires serious compute. Upgrade to Pro for unlimited AI diagrams and advanced SVG exports.
              </p>
              <div className="space-y-4">
                <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" className="block w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Unlock Unlimited Access</a>
                <button onClick={() => setShowPaywall(false)} className="block w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Maybe later</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Bar */}
      <div className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-xl z-10 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Visual Architecture 
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md text-[8px] font-black uppercase">v2.0 Beta</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">AI-Powered System Synthesis</p>
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {[
              { id: 'visual', icon: <Eye size={14} />, label: 'Preview' },
              { id: 'code', icon: <Code2 size={14} />, label: 'Mermaid' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.icon} <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {!isPro && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                {trialCount} AI Credits
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={generateDiagram}
            disabled={isGenerating}
            className="group px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} className="group-hover:rotate-12 transition-transform" />}
            <span>Synthesize Architecture</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Workspace - Editor */}
        <div className="w-[380px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Input Specification</span>
            <div className="flex gap-2">
              <Box size={14} className="text-slate-300" />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              theme={isDark ? "vs-dark" : "light"}
              language="sql"
              value={input}
              onChange={(v) => setInput(v || "")}
              options={{ 
                minimap: { enabled: false }, 
                fontSize: 12, 
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on',
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 2,
                padding: { top: 20 },
                scrollBeyondLastLine: false,
                wordWrap: 'on'
              }}
            />
          </div>
        </div>

        {/* Workspace - Visualizer */}
        <div className="flex-1 bg-slate-50 dark:bg-[#020617] flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-auto p-12 flex items-center justify-center custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'visual' ? (
                svg ? (
                  <motion.div
                    key="diagram"
                    initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                    animate={{ opacity: 1, scale: zoom, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="bg-white dark:bg-slate-900 p-16 rounded-[4rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 relative group"
                  >
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[4rem] pointer-events-none" />
                    <div 
                      className="max-w-full overflow-visible"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-xs">
                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-2xl border border-slate-200 dark:border-slate-700">
                      <Sparkles size={40} className="text-blue-500" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">No Architecture Found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Paste your SQL schema or JSON data and let our AI engine visualize the internal relationships.</p>
                  </motion.div>
                )
              ) : (
                <motion.div key="code" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full p-8">
                  <div className="w-full h-full bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language="mermaid"
                      value={mermaidCode}
                      onChange={(v) => setMermaidCode(v || "")}
                      options={{ 
                        minimap: { enabled: false }, 
                        fontSize: 14, 
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: { top: 30, bottom: 30 }
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating Action Controls */}
          {svg && activeTab === 'visual' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-20"
            >
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-2xl transition-all"><ZoomIn size={18} /></button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
              <button onClick={handleDownloadSVG} className="flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                <Download size={14} /> <span>Export SVG</span>
              </button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
              <button className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-2xl transition-all"><Share2 size={18} /></button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] px-8 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <MousePointer2 size={12} className="text-blue-500" />
            Interactive Viewport Ready
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={12} className="text-indigo-500" />
            Engine: Mermaid v10.9
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">TypeFlow Pro</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            <div className="w-1 h-1 rounded-full bg-blue-500/50" />
            <div className="w-1 h-1 rounded-full bg-blue-500/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

