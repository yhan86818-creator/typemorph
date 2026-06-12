'use client';

import { trackProClick } from '@/lib/analytics';
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Download, Layers, Wand2, Loader2, Maximize2, 
  ZoomIn, Crown, ShieldAlert, Sparkles, MousePointer2, 
  Box, GitBranch, RefreshCw, Eye, Code2
} from 'lucide-react';
import mermaid from 'mermaid';
import { callGeminiWithRetry } from '@/lib/gemini';

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
    
    /* Premium ER Diagram High-Contrast Overrides */
    .er.attributeBoxInterval {
      fill: ${isDark ? '#1e293b' : '#f8fafc'} !important;
      stroke: ${isDark ? '#334155' : '#cbd5e1'} !important;
    }
    .er.attributeBoxInterval text {
      fill: ${isDark ? '#cbd5e1' : '#334155'} !important;
      font-size: 10px !important;
    }
    g.er.entityBox rect {
      fill: ${isDark ? '#1e293b' : '#ffffff'} !important;
      stroke: ${isDark ? '#334155' : '#e2e8f0'} !important;
      stroke-width: 2px !important;
    }
    .er.entityLabel {
      fill: ${isDark ? '#ffffff' : '#0f172a'} !important;
      font-weight: 800 !important;
    }
    .er.relationshipLabelBox {
      fill: ${isDark ? '#0f172a' : '#ffffff'} !important;
      stroke: ${isDark ? '#6366f1' : '#3b82f6'} !important;
    }
    .er.relationshipLabel {
      fill: ${isDark ? '#cbd5e1' : '#1e293b'} !important;
      font-weight: bold !important;
      font-size: 10px !important;
    }
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
  const [svgError, setSvgError] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [diagramType, setDiagramType] = useState('Autodetect');
  const [zoom, setZoom] = useState(1);
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Initial Magic Data Handling
  useEffect(() => {
    const magicData = localStorage.getItem('typemorph_magic_data');
    if (magicData) {
      setTimeout(() => setInput(magicData), 0);
      localStorage.removeItem('typemorph_magic_data');
      if (geminiKey && (isPro || trialCount > 0)) {
        setTimeout(() => generateDiagramRef.current?.(), 500);
      }
    }
  }, [geminiKey, isPro]);

  const healMermaidCode = (raw: string): string => {
    let code = raw
      .replace(/^```mermaid\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    const isErDiagram = code.includes('erDiagram');
    const isFlowchart = code.includes('flowchart') || code.includes('graph');

    if (isErDiagram) {
      // 1. Strip parentheses from type annotations: VARCHAR(255) → VARCHAR
      code = code.replace(/(\b[A-Za-z_]+)\([^)]*\)/g, '$1');
      // 2. Remove illegal quotes from field names: string "id" → string id
      code = code.replace(/(\w+)\s+"([\w]+)"/g, '$1 $2');
      // 3. Remove quotes from entity names in declarations: "USER" { → USER {
      code = code.replace(/"(\w+)"\s*\{/g, '$1 {');
      
      // 4. Remove quotes from entity names in relationship definitions: "USER" ||--o{ "POST" : "writes" → USER ||--o{ POST : "writes"
      code = code.replace(/^([^\n:]*?)"(\w+)"([^\n:]*?)(?=:)/gm, '$1$2$3');
      code = code.replace(/^([^\n:]*?)"(\w+)"([^\n:]*?)(?=:)/gm, '$1$2$3');

      // 5. Auto-quote unquoted relation labels (Mermaid v11 strict requirement)
      code = code.replace(/:\s*([^"\r\n]+)$/gm, (_match, p1) => {
        const label = p1.trim();
        if (!label) return _match;
        if (label.startsWith('"') && label.endsWith('"')) return _match;
        // Strip trailing comment if present
        const cleanLabel = label.replace(/%%.*$/, '').trim();
        return `: "${cleanLabel}"`;
      });
      // 6. Remove illegal subgraph / end blocks
      code = code.replace(/^\s*subgraph\s+.*$/gm, '');
      code = code.replace(/^\s*end\s*$/gm, '');
      
      // 7. Ensure closing brace is on its own line to prevent "Expecting ATTRIBUTE_WORD, got BLOCK_STOP"
      code = code.replace(/\}/g, '\n}\n');
    }

    if (isFlowchart) {
      // Auto-quote unquoted node labels containing spaces, parentheses or special characters to prevent Mermaid parser crashes
      // E.g. A[User Session (JWT)] → A["User Session (JWT)"]
      code = code.replace(/(\w+)\s*\[([^"\]\n]+)\]/g, (_match, id, label) => {
        const trimmed = label.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return _match;
        return `${id}["${trimmed}"]`;
      });
      code = code.replace(/(\w+)\s*\(([^")\n]+)\)/g, (_match, id, label) => {
        const trimmed = label.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return _match;
        return `${id}("${trimmed}")`;
      });
      code = code.replace(/(\w+)\s*\{([^"}\n]+)\}/g, (_match, id, label) => {
        const trimmed = label.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return _match;
        return `${id}{"${trimmed}"}`;
      });
    }

    // For all types: trim trailing whitespace, collapse 3+ blank lines
    code = code
      .split('\n')
      .map((l: string) => l.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return code;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const generateDiagramRef = React.useRef<(() => void) | null>(null);

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
        1. DIAGRAM SELECTION & STRUCTURE RULES:
           - DB Schema/DDL -> erDiagram (Focus on relations and PK/FK. IMPORTANT: erDiagram does NOT support "subgraph" or "end". Never use subgraphs here).
           - Code/Logic -> classDiagram (Focus on methods and inheritance).
           - Flow/Processes -> flowchart TD (Use proper nodes: [Rect] for steps, {Hex} for decisions).
           - Async/API -> sequenceDiagram (Focus on participants and timing).
           - Cloud/Infra -> flowchart LR with subgraphs for clusters (Only flowchart supports subgraphs).
        
        2. VISUAL STANDARDS:
           - Use UPPERCASE for Entity names.
           - For erDiagram: types must be simple (e.g. UUID, STRING, INT). No spaces.
           - For flowchart: Add descriptive labels to connectors (e.g. -->|on success|).
           - Group related entities using subgraphs only for flowchart/infra.
        
        3. SYNTAX INTEGRITY:
           - Ensure erDiagram entities have the format: ENTITY { type name } (NO quotes around types or field names).
           - For erDiagram relationships, the description MUST be quoted in double quotes (e.g. USER ||--o{ POST : "writes").
           - For flowchart and others, quote node labels containing spaces or special characters using brackets (e.g. A["Node Text"]).
           - Ensure all blocks are closed. Output ONLY the raw code.
        
        INPUT TO VISUALIZE:
        ${input}
      `;

      const rawText = await callGeminiWithRetry(geminiKey, prompt);
      let code = '';
      
      // Robust markdown code block extractor
      const mermaidMatch = rawText.match(/```mermaid([\s\S]*?)```/i) || rawText.match(/```([\s\S]*?)```/);
      if (mermaidMatch) {
        code = mermaidMatch[1].trim();
      } else {
        code = rawText.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
      }
      
      // Apply Auto-Healer before setting state
      code = healMermaidCode(code);
      
      setSvgError('');
      setMermaidCode(code);
      setActiveTab('visual');
      
      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typemorph_trial_count', String(newCount));
      }
    } catch (e: any) {
      console.error('ArchitectureView Error:', e);
      alert(`AI Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Sync ref with latest generateDiagram so the magic-data timeout can call it safely
  // eslint-disable-next-line
  generateDiagramRef.current = generateDiagram;

  const handleDownloadSVG = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typemorph-arch-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = (useTransparent: boolean = true) => {
    if (!svg) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return;

      // Get natural SVG dimensions
      const width = svgEl.viewBox.baseVal.width || svgEl.width.baseVal.value || 800;
      const height = svgEl.viewBox.baseVal.height || svgEl.height.baseVal.value || 600;

      // High-resolution scale factor (3x) for pristine presentation quality
      const scale = 3; 
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Draw background if not transparent
        if (!useTransparent) {
          ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `typemorph-arch-${Date.now()}-${useTransparent ? 'transparent' : 'solid'}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
        }, 'image/png');

        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      console.error("Failed to export PNG:", err);
      alert("Export failed. Please try Exporting SVG instead.");
    }
  };

  useEffect(() => {
    mermaid.initialize(getMermaidConfig(isDark) as any);
    
    if (mermaidCode) {
      const render = async () => {
        try {
          // Apply healer again at render time (covers manual edits in Code tab)
          const healed = healMermaidCode(mermaidCode);
          const { svg: renderedSvg } = await mermaid.render('mermaid-render-' + Math.random().toString(36).substr(2, 9), healed);
          setSvg(renderedSvg);
          setSvgError('');
        } catch (e: any) {
          console.error("Mermaid Render Error", e);
          setSvgError('Diagram syntax error. Regenerate or switch to Code tab to fix manually.');
        }
      };
      render();
    }
  }, [mermaidCode, isDark]);

  // Dynamic Role-based Auto-Coloring Engine
  useEffect(() => {
    if (activeTab === 'visual' && svg && mermaidRef.current) {
      const nodes = mermaidRef.current.querySelectorAll('.node');
      nodes.forEach(node => {
        const labelEl = node.querySelector('.label') || node;
        const text = labelEl.textContent?.toLowerCase() || '';

        // Find primary boundary shape element of the node
        const shape = node.querySelector('rect, circle, polygon, path, .label-container');
        if (!shape) return;

        let fill = '';
        let stroke = '';
        let shadow = '';

        if (
          text.includes('db') || 
          text.includes('table') || 
          text.includes('users') || 
          text.includes('posts') || 
          text.includes('comments') || 
          text.includes('sql') || 
          text.includes('mongo') || 
          text.includes('redis') || 
          text.includes('database') || 
          text.includes('store') ||
          text.includes('repository')
        ) {
          // Database / Entity (Emerald Green)
          fill = isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(209, 250, 229, 0.7)';
          stroke = '#10b981';
          shadow = isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.15)';
        } 
        else if (
          text.includes('auth') || 
          text.includes('login') || 
          text.includes('secure') || 
          text.includes('jwt') || 
          text.includes('session') || 
          text.includes('token') || 
          text.includes('shield') ||
          text.includes('guard')
        ) {
          // Security / Auth (Coral Rose)
          fill = isDark ? 'rgba(244, 63, 94, 0.12)' : 'rgba(FFE4E6, 0.7)';
          stroke = '#f43f5e';
          shadow = isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(244, 63, 94, 0.15)';
        } 
        else if (
          text.includes('api') || 
          text.includes('route') || 
          text.includes('controller') || 
          text.includes('gateway') || 
          text.includes('service') || 
          text.includes('fetch') || 
          text.includes('http') ||
          text.includes('client')
        ) {
          // API / Endpoint / Gateway (Neon Blue)
          fill = isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(219, 234, 254, 0.7)';
          stroke = '#3b82f6';
          shadow = isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.15)';
        } 
        else if (
          text.includes('queue') || 
          text.includes('pubsub') || 
          text.includes('kafka') || 
          text.includes('rabbit') || 
          text.includes('async') || 
          text.includes('worker') || 
          text.includes('job') || 
          text.includes('event') ||
          text.includes('message')
        ) {
          // Async / Worker / Queue (Amber Gold)
          fill = isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(FEF3C7, 0.7)';
          stroke = '#f59e0b';
          shadow = isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.15)';
        } 
        else if (
          text.includes('user') || 
          text.includes('actor') || 
          text.includes('customer') || 
          text.includes('admin') || 
          text.includes('frontend') || 
          text.includes('ui') || 
          text.includes('browser') || 
          text.includes('app') || 
          text.includes('mobile')
        ) {
          // Actor / UI / Client (Amethyst Violet)
          fill = isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(EDE9FE, 0.7)';
          stroke = '#8b5cf6';
          shadow = isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(139, 92, 246, 0.15)';
        }

        if (fill && stroke) {
          shape.setAttribute('style', `
            fill: ${fill} !important;
            stroke: ${stroke} !important;
            stroke-width: 2.5px !important;
            filter: drop-shadow(0 0 8px ${shadow}) !important;
            transition: all 0.3s ease;
          `);
        }
      });
    }
  }, [svg, isDark, activeTab, zoom]);

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
              <div className="w-20 h-20 bg-slate-900 dark:bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white dark:text-slate-900 shadow-xl">
                <Crown size={40} />
              </div>
              <h2 className="text-3xl font-black mb-4 dark:text-white">Pro Architect</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                Visualizing complex systems requires serious compute. Upgrade to Pro for unlimited AI diagrams and advanced SVG exports.
              </p>
              <div className="space-y-4">
                <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" rel="noopener noreferrer" onClick={() => trackProClick('architecture_paywall')} className="block w-full text-slate-900 dark:text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all">Unlock Unlimited Access</a>
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
            <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 shadow-lg">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-sm font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Visual Architecture 
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white border border-slate-200 dark:border-white/10 rounded-md text-[8px] font-mono uppercase">v2.0 Beta</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400">AI-Powered System Synthesis</p>
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
                className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.icon} <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {!isPro && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.2em] bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                {trialCount} AI Credits
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={generateDiagram}
            disabled={isGenerating}
            className="group px-6 py-3 text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
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
                    ref={mermaidRef}
                    key="diagram"
                    initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                    animate={{ opacity: 1, scale: zoom, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="bg-white dark:bg-slate-900 p-16 rounded-[4rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 relative group"
                  >
                    <div className="absolute inset-0 bg-slate-900/[0.03] dark:bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity rounded-[4rem] pointer-events-none" />
                    <div 
                      className="max-w-full overflow-visible"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </motion.div>
                ) : svgError ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-red-200 dark:border-red-800">
                      <ShieldAlert size={36} className="text-red-500" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">Diagram Syntax Error</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">{svgError}</p>
                    <button
                      onClick={generateDiagram}
                      className="px-5 py-2.5 text-slate-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 transition-all"
                    >
                      Regenerate
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-xs">
                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-2xl border border-slate-200 dark:border-slate-700">
                      <Sparkles size={40} className="text-slate-300 dark:text-slate-600" />
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
                        padding: { top: 16, bottom: 16 },
                        automaticLayout: true,
                        wordWrap: 'on',
                        scrollbar: { vertical: 'auto', horizontal: 'auto' },
                        renderLineHighlight: 'none'
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
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-3 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl transition-all"><ZoomIn size={18} /></button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
              <button 
                onClick={handleDownloadSVG} 
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-mono text-[9px] uppercase tracking-widest hover:scale-105 transition-all shrink-0"
              >
                <Download size={12} /> <span>SVG</span>
              </button>
              <button 
                onClick={() => handleExportPNG(true)} 
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-slate-900 rounded-xl font-mono text-[9px] uppercase tracking-widest hover:scale-105 transition-all shrink-0 shadow-sm"
              >
                <Download size={12} /> <span>PNG (Transparent)</span>
              </button>
              <button 
                onClick={() => handleExportPNG(false)} 
                className="flex items-center gap-2 px-4 py-2.5 text-slate-900 dark:text-white rounded-xl font-mono text-[9px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 transition-all shrink-0"
              >
                <Download size={12} /> <span>PNG (Solid)</span>
              </button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
              <button className="p-3 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl transition-all"><Share2 size={18} /></button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] px-8 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <MousePointer2 size={12} className="text-slate-400" />
            Interactive Viewport Ready
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={12} className="text-slate-400" />
            Engine: Mermaid v10.9
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">TypeMorph</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-slate-400" />
            <div className="w-1 h-1 rounded-full bg-slate-400/50" />
            <div className="w-1 h-1 rounded-full bg-slate-400/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

