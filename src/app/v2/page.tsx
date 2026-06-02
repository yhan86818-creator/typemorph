'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function TypeFlowV2() {
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [inputCode, setInputCode] = useState('{\n  "user": {\n    "id": "usr_12345",\n    "email": "dev@typeflow.pro",\n    "isActive": true,\n    "roles": ["admin", "developer"]\n  }\n}');
  const [outputCode, setOutputCode] = useState('');
  const [logs, setLogs] = useState<{ msg: string; type: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [latency, setLatency] = useState('Net: 0ms');
  const [tokenCount, setTokenCount] = useState('0 tokens');
  
  const cmdKInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const handleGenerateRef = useRef<(() => void) | null>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdKOpen(true);
      }
      // Cmd+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating) handleGenerateRef.current?.();
      }
      // Esc
      if (e.key === 'Escape') {
        if (cmdKOpen) {
          setCmdKOpen(false);
        } else {
          setInputCode('');
          setOutputCode('');
          setLogs([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cmdKOpen, isGenerating]);

  // Focus input when modal opens
  useEffect(() => {
    if (cmdKOpen && cmdKInputRef.current) {
      setTimeout(() => cmdKInputRef.current?.focus(), 50);
    }
  }, [cmdKOpen]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLogs([]);
    setOutputCode('');
    
    const mockLogs = [
      { msg: "[SYSTEM] Initializing local BYOK engine...", type: "info", delay: 100 },
      { msg: "[AST] Parsing JSON payload...", type: "info", delay: 300 },
      { msg: "[INFER] Type inference complete (Found: Object, String, Boolean, Array)", type: "info", delay: 600 },
      { msg: "[GEN] Mapping to Zod primitives...", type: "info", delay: 800 },
      { msg: "[SUCCESS] Schema generated in 42ms. (Local Mode)", type: "success", delay: 1100 }
    ];

    // Simulate logs appearing over time
    for (const log of mockLogs) {
      await new Promise(r => setTimeout(r, log.delay - (logs.length > 0 ? mockLogs[mockLogs.indexOf(log) - 1].delay : 0)));
      setLogs(prev => [...prev, log]);
    }

    // Final output
    setTimeout(() => {
      setOutputCode(`import { z } from "zod";\n\nexport const UserSchema = z.object({\n  user: z.object({\n    id: z.string(),\n    email: z.string().email(),\n    isActive: z.boolean(),\n    roles: z.array(z.string()),\n  }),\n});\n\nexport type User = z.infer<typeof UserSchema>;`);
      setTokenCount("124 tokens");
      setLatency("Exec: 42ms");
      setIsGenerating(false);
    }, 200);
  };

  // Sync ref with latest handleGenerate
  // eslint-disable-next-line
  handleGenerateRef.current = handleGenerate;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#22272e] text-[#adbac7] font-sans">
      {/* Topbar */}
      <header className="flex justify-between items-center px-6 py-3 border-b border-[#444c56] bg-[#22272e]">
        <div className="flex items-center gap-2 font-mono text-sm text-[#adbac7]">
          <ShieldCheck size={20} className="text-[#f59e0b]" />
          TypeFlow Pro
          <span className="text-[#768390] text-xs font-normal border border-[#444c56] px-1.5 py-0.5 rounded ml-2">v2.0-beta</span>
        </div>
        
        <div className="flex items-center gap-6 font-mono text-xs text-[#768390]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#57ab5a] rounded-full shadow-[0_0_8px_#57ab5a]"></span>
            Local BYOK Active
          </div>
          <div>{latency}</div>
          <div className="flex items-center gap-1">
            <kbd className="font-mono bg-[#2d333b] border border-[#444c56] px-1.5 py-0.5 rounded text-[10px] text-[#adbac7]">?</kbd>
            Help
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Minimal Sidebar */}
        <aside className="w-64 border-r border-[#444c56] bg-[#2d333b] p-4 flex flex-col gap-6">
          <button 
            onClick={() => setCmdKOpen(true)}
            className="w-full flex justify-between items-center bg-[#22272e] border border-[#444c56] rounded-md px-3 py-2 text-sm text-[#768390] hover:border-[#768390] transition-colors"
          >
            <span className="flex items-center gap-2"><Search size={14} /> Search tools...</span>
            <kbd className="font-mono bg-[#2d333b] border border-[#444c56] px-1.5 py-0.5 rounded text-[10px] text-[#adbac7]">⌘K</kbd>
          </button>

          <div>
            <h3 className="text-xs uppercase text-[#768390] mb-2 font-semibold tracking-wider">Favorites</h3>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center px-2 py-1.5 bg-[#444c56] rounded text-sm text-[#adbac7] cursor-pointer">
                JSON to Zod
                <span className="text-[#768390] font-mono text-xs">1</span>
              </div>
              <div className="flex justify-between items-center px-2 py-1.5 rounded text-sm text-[#adbac7] hover:bg-[#444c56] cursor-pointer transition-colors">
                Prisma to API
                <span className="text-[#768390] font-mono text-xs">2</span>
              </div>
              <div className="flex justify-between items-center px-2 py-1.5 rounded text-sm text-[#adbac7] hover:bg-[#444c56] cursor-pointer transition-colors">
                HL7 Parser
                <span className="text-[#768390] font-mono text-xs">3</span>
              </div>
            </div>
          </div>
          
          <div className="mt-auto">
            <h3 className="text-xs uppercase text-[#768390] mb-2 font-semibold tracking-wider">Workspace</h3>
            <div className="flex justify-between items-center px-2 py-1.5 rounded text-sm text-[#adbac7] hover:bg-[#444c56] cursor-pointer transition-colors">
              Settings
              <span className="text-[#768390] font-mono text-xs">⌘,</span>
            </div>
          </div>
        </aside>

        {/* Editor Workspace */}
        <section className="flex-1 flex flex-col p-6 bg-[#22272e] overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-2">JSON to Zod Schema</h1>
            <p className="text-[#768390] text-sm">Instantly generate Zod validation schemas from JSON payloads. Runs 100% locally.</p>
          </div>

          {/* Dual Pane Editors */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-[400px]">
            {/* Input Pane */}
            <div className="flex flex-col border border-[#444c56] rounded-lg overflow-hidden bg-[#2d333b]">
              <div className="flex justify-between items-center px-3 py-2 border-b border-[#444c56] bg-[#22272e] font-mono text-xs text-[#768390]">
                <span>Input (JSON)</span>
                <span>Auto-detect</span>
              </div>
              <textarea 
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="flex-1 w-full bg-transparent border-none text-[#adbac7] font-mono text-sm p-4 resize-none outline-none focus:ring-0"
                spellCheck={false}
              />
            </div>

            {/* Output Pane */}
            <div className="flex flex-col border border-[#444c56] rounded-lg overflow-hidden bg-[#2d333b]">
              <div className="flex justify-between items-center px-3 py-2 border-b border-[#444c56] bg-[#22272e] font-mono text-xs text-[#768390]">
                <span>Output (TypeScript)</span>
                <span>{tokenCount}</span>
              </div>
              <textarea 
                value={outputCode}
                readOnly
                placeholder="Output will appear here..."
                className="flex-1 w-full bg-transparent border-none text-[#adbac7] font-mono text-sm p-4 resize-none outline-none focus:ring-0 placeholder-[#768390]"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-4 text-xs text-[#768390]">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-[#2d333b] border border-[#444c56] px-1.5 py-0.5 rounded">⌘</kbd> + 
                <kbd className="font-mono bg-[#2d333b] border border-[#444c56] px-1.5 py-0.5 rounded">Enter</kbd> to generate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-[#2d333b] border border-[#444c56] px-1.5 py-0.5 rounded">Esc</kbd> to clear
              </span>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-[#539bf5] hover:bg-[#428ae4] active:scale-95 text-white font-semibold px-4 py-2 rounded-md transition-all disabled:opacity-50"
            >
              {isGenerating ? <Zap size={16} className="animate-pulse" /> : <Terminal size={16} />}
              Run Transformation
              <kbd className="font-mono bg-black/20 text-white border-none px-1.5 py-0.5 rounded text-[10px]">⌘↵</kbd>
            </button>
          </div>

          {/* Terminal Log Area */}
          {logs.length > 0 && (
            <div 
              ref={terminalRef}
              className="mt-4 bg-[#0d1117] border border-[#444c56] rounded-md p-3 font-mono text-xs h-32 overflow-y-auto flex flex-col gap-1"
            >
              {logs.map((log, i) => (
                <div key={i} className={`flex items-start gap-2 ${log.type === 'success' ? 'text-[#57ab5a]' : 'text-[#539bf5]'}`}>
                  <span>{'>'}</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Cmd+K Modal Overlay */}
      {cmdKOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start pt-[15vh] z-50"
          onClick={() => setCmdKOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-[#2d333b] border border-[#444c56] rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-4 border-b border-[#444c56]">
              <Search size={20} className="text-[#768390] mr-3" />
              <input 
                ref={cmdKInputRef}
                type="text" 
                placeholder="Type a command or search tools..."
                className="w-full bg-transparent border-none text-[#adbac7] text-lg outline-none placeholder-[#768390]"
              />
            </div>
            <div className="p-3 text-xs text-[#768390] flex justify-between items-center bg-[#22272e]">
              <span>Try typing &quot;prisma&quot; or &quot;sql&quot;</span>
              <kbd className="font-mono bg-[#2d333b] border border-[#444c56] px-1.5 py-0.5 rounded text-[10px] text-[#adbac7]">Esc to close</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
