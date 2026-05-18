'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import Editor from '@monaco-editor/react';
import LZString from 'lz-string';
import { 
  Terminal, Share2, Copy, FileJson, Sparkles, Settings, Loader2, Monitor, Trash2, Code2, Zap, Crown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  runEngine, parseYAML, parseXML, parseCurl, curlToTypeScript, parseSQLToZod 
} from '@/lib/engine';
import { JsonVisualizer, Toast } from './SharedUI';
import { History as HistoryIcon, Clock, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import SuperBatchModal from './SuperBatchModal';

interface WorkbenchProps {
  slug: string;
  isDark: boolean;
  geminiKey: string;
  outputTab: string;
  setOutputTab: (tab: string) => void;
  isPro?: boolean;
  setShowLicenseModal?: (show: boolean) => void;
  trialCount?: number;
  setTrialCount?: (c: number) => void;
  user: User | null;
}

export function Workbench({ slug, isDark, geminiKey, outputTab, setOutputTab, isPro, setShowLicenseModal, trialCount = 3, setTrialCount, user }: WorkbenchProps) {
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [outputs, setOutputs] = useState<any>({});
  const [jsonData, setJsonData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isAiUiLoading, setIsAiUiLoading] = useState(false);
  const [uiTheme, setUiTheme] = useState('glassmorphism');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [hasParseError, setHasParseError] = useState(false);

  const [showGenSettings, setShowGenSettings] = useState(false);
  const [genSettings, setGenSettings] = useState({
    exportDefault: false,
    optionalFields: false,
    useUUID: true,
  });

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem('typeflow_gen_settings');
    if (saved) {
      try {
        setGenSettings(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('typeflow_gen_settings', JSON.stringify(genSettings));
  }, [genSettings]);

  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);

  const handleAiSmartParse = useCallback(async () => {
    if (!geminiKey) return;
    setIsAiLoading(true);
    try {
      setAiStatus("Analyzing structure...");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Clean this input into valid minified JSON. If it's a log, extract the primary object. Return ONLY the JSON: ${inputRef.current}` }] }]
        })
      });
      setAiStatus("Extracting logic...");
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setAiStatus("Success!");
        setInput(text.replace(/```json/g, '').replace(/```/g, '').trim());
      }
    } catch (e) { 
      setAiStatus("Failed.");
      console.error(e); 
    }
    finally { 
      setTimeout(() => {
        setIsAiLoading(false);
        setAiStatus("");
      }, 1000);
    }
  }, [geminiKey]); // Only depend on geminiKey

  const handleAiUiGenerate = useCallback(async () => {
    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top cockpit to use AI UI Generation.");
      return;
    }
    const targetData = jsonData || input;
    if (!targetData) {
      alert("Please enter some input data first.");
      return;
    }
    setIsAiUiLoading(true);
    try {
      let themePrompt = '';
      if (uiTheme === 'glassmorphism') {
        themePrompt = `
        THEME STYLE: Glassmorphism (Frosted glass elegance)
        - Background: Semi-transparent backdrop blur (bg-white/10 dark:bg-slate-900/40 backdrop-blur-md).
        - Borders: Subtle white/slate borders (border border-white/20 dark:border-slate-800/50).
        - Glow/Shadows: Smooth, deep, soft shadows (shadow-2xl shadow-indigo-500/10).
        - Colors: Elegant indigo, violet, and slate shades. Soft HSL gradients.
        `;
      } else if (uiTheme === 'cyberpunk') {
        themePrompt = `
        THEME STYLE: Cyberpunk Neon (Futuristic, high-contrast gaming/cyber vibes)
        - Background: Deep pitch-black background (bg-[#030712] dark:bg-black).
        - Borders: Vibrant glowing neon borders (border border-cyan-500/40 dark:border-pink-500/40). Use glow effects on hover.
        - Glow/Shadows: Intense neon drop shadows (shadow-[0_0_15px_rgba(6,182,212,0.35)]).
        - Colors: Electric cyan, toxic lime green, glowing pink, bright yellow. Use dark/neon contrast.
        `;
      } else if (uiTheme === 'minimalist') {
        themePrompt = `
        THEME STYLE: Minimal Stark (Ultra-clean high-fashion minimalist)
        - Background: Pure solid white or stark pitch-black (bg-white dark:bg-slate-950).
        - Borders: Super thin stark black/white lines (border border-slate-900 dark:border-slate-100). No rounded corners or very sharp 4px corners (rounded-none or rounded-md).
        - Glow/Shadows: Flat shadows or absolutely no shadow (shadow-none) for that high-art gallery feel.
        - Colors: Monochromatic grayscale (stark black, pure white, gray-500/800). No colorful gradients. Extremely clean typography.
        `;
      }

      const prompt = `
        You are an Elite Frontend Architect at a top-tier design lab.
        TASK: Create an extremely stunning, production-ready, high-fidelity React component named "ComponentCard" that beautifully represents the provided data structure.
        
        DATA:
        ${typeof targetData === 'string' ? targetData : JSON.stringify(targetData, null, 2)}
        
        ${themePrompt}
        
        STYLING & CODING RULES:
        1. Write a pure React functional component using TypeScript:
           export const ComponentCard = ({ data }: { data: any }) => { ... }
        2. Leverage Tailwind CSS for top-tier aesthetics matching the SPECIFIED THEME STYLE.
        3. Render properties intelligently:
           - Emails/URLs -> Beautiful clickable elements.
           - Badges/Status -> Rounded capsules with pulsing indicators.
           - Arrays -> Elegant flex lists or chip lists.
           - Profile/User -> Prominent premium header card layout.
        4. To prevent render failures, do NOT import external icons/images (like lucide-react). For visual flair, draw clean vector inline SVGs with Tailwind styling, or use elegant unicode.
        5. Return ONLY the compile-ready React code starting directly with 'import React'. Do NOT wrap in markdown backticks.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Safe markdown strip
        text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        setOutputs((prev: any) => ({ ...prev, ui: text }));
        setOutputTab('ui');
        
        setToastMsg("Premium UI Created!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        throw new Error("No UI content generated.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`AI UI Generation failed: ${e.message || "Invalid API response"}`);
    } finally {
      setIsAiUiLoading(false);
    }
  }, [geminiKey, input, jsonData, uiTheme, setOutputTab]);

  const handleAiSynthesizeData = useCallback(async () => {
    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top cockpit to use AI Synthesis.");
      return;
    }
    const targetData = jsonData || input;
    if (!targetData) {
      alert("Please enter some input data first.");
      return;
    }
    setIsSynthesizing(true);
    try {
      const prompt = `
        You are an Expert Data Engineer at a top-tier systems design lab.
        TASK: Generate exactly 50 highly realistic, diverse, global-spec (English names, real-looking email domains, international telephone numbers, ISO date-times, valid mock IDs) data rows matching the provided data schema.
        
        SCHEMA / PATTERN:
        ${typeof targetData === 'string' ? targetData : JSON.stringify(targetData, null, 2)}
        
        RULES:
        1. Return a single, valid JSON array containing exactly 50 objects.
        2. Ensure all fields in the schema are populated with high-quality, realistic English data.
        3. Do NOT include any explanations or markdown backticks. Return ONLY the raw valid minified JSON array.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            setOutputs((prev: any) => ({ ...prev, mock: JSON.stringify(parsed, null, 2) }));
            setToastMsg("Synthesized 50 Global Rows!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
          } else {
            throw new Error("Response was not a JSON array.");
          }
        } catch (e) {
          const match = text.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            setOutputs((prev: any) => ({ ...prev, mock: JSON.stringify(parsed, null, 2) }));
            setToastMsg("Synthesized 50 Global Rows!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
          } else {
            throw new Error("Unable to parse generated mock data as JSON array.");
          }
        }
      } else {
        throw new Error("No content returned from Gemini API.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Synthesis failed: ${e.message || "Invalid API response"}`);
    } finally {
      setIsSynthesizing(false);
    }
  }, [geminiKey, input, jsonData]);

  const downloadMockJson = useCallback(() => {
    const dataStr = outputs['mock'] || "";
    if (!dataStr) return;
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug || 'mock'}_data.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [outputs, slug]);

  const downloadMockCsv = useCallback(() => {
    const dataStr = outputs['mock'] || "";
    if (!dataStr) return;
    try {
      const parsed = JSON.parse(dataStr);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length === 0) return;
      
      const keys = Object.keys(arr[0]);
      const csvContent = [
        keys.join(','),
        ...arr.map(row => keys.map(k => {
          const val = row[k];
          const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val === null || val === undefined ? '' : val);
          return `"${valStr.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug || 'mock'}_data.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export as CSV. Ensure mock data is a valid JSON array.");
    }
  }, [outputs, slug]);

  const handleAiSchemaHeal = useCallback(async () => {
    if (!geminiKey) {
      alert("Please enter your Gemini API Key in the top cockpit to use AI Schema Healing.");
      return;
    }
    if (!input.trim()) return;
    setIsAiLoading(true);
    setAiStatus("Healing syntax...");
    try {
      const prompt = `
        You are an Elite Code and Schema Healing Engine.
        TASK: Fix any broken syntax (missing commas, unclosed quotes, unbalanced brackets, trailing commas, or truncated lines) in the following text.
        Ensure the output is 100% syntactically correct and well-formatted based on its apparent type (JSON, SQL, XML, or YAML).
        
        INPUT TO HEAL:
        ${inputRef.current}
        
        RULES:
        1. Fix all syntax errors, but PRESERVE all original keys, fields, and values.
        2. Return ONLY the healed, pristine code. Do NOT wrap in markdown backticks.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const healed = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        setInput(healed);
        setHasParseError(false);
        setToastMsg("Syntax Healed by AI!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to heal schema.");
    } finally {
      setIsAiLoading(false);
      setAiStatus("");
    }
  }, [geminiKey, input]);

  const processInput = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setHasParseError(false);
      return;
    }
    let res: any = {};
    let jsonObj: any = null;
    let success = false;
    
    if (trimmed.toLowerCase().startsWith('curl')) {
      try {
        const parsed = parseCurl(trimmed);
        res.hook = curlToTypeScript(parsed);
        if (parsed.bodyJson) {
          setJsonData(parsed.bodyJson);
          res.typescript = runEngine(parsed.bodyJson, 'typescript', slug);
          success = true;
        }
      } catch (e) {}
    } 
    else if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
      try {
        res.zod = parseSQLToZod(trimmed);
        if (res.zod) success = true;
      } catch (e) {}
    }
    else {
      try {
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          jsonObj = JSON.parse(trimmed);
          success = true;
        }
        else if (trimmed.startsWith('<')) {
          jsonObj = parseXML(trimmed);
          if (jsonObj && Object.keys(jsonObj).length > 0) success = true;
        }
        else {
          jsonObj = parseYAML(trimmed);
          if (jsonObj && Object.keys(jsonObj).length > 0) success = true;
        }
      } catch (e) {}

      if (jsonObj) {
        setJsonData(jsonObj);
        ['typescript', 'zod', 'go', 'rust', 'java', 'python', 'dart', 'php', 'protobuf', 'graphql', 'swift', 'kotlin', 'sql', 'jsonschema', 'mock', 'ui', 'doc'].forEach(lang => {
          res[lang] = runEngine(jsonObj, lang, slug, genSettings);
        });
        res.json = JSON.stringify(jsonObj, null, 2);
      }
    }
    setOutputs(res);
    setHasParseError(!success);
  }, [input, slug, genSettings]);

  useEffect(() => { processInput(); }, [processInput]);

  // History Management
  useEffect(() => {
    const saved = localStorage.getItem('typeflow_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = useCallback(async (content: string) => {
    if (!content || content.length < 10) return;
    
    // Save to local storage (for guests)
    setHistory(prev => {
      const filtered = prev.filter(h => h.content !== content);
      const next = [{ content, timestamp: new Date().toISOString() }, ...filtered].slice(0, 5);
      localStorage.setItem('typeflow_history', JSON.stringify(next));
      return next;
    });

    // Save to Supabase (for logged in users)
    if (user) {
      const { error } = await supabase
        .from('conversion_history')
        .insert([{ 
          user_id: user.id, 
          tool_slug: slug, 
          input_data: content, 
          output_data: JSON.stringify(outputs) 
        }]);
      
      if (error) console.error('Error saving to Supabase:', error);
    }
  }, [user, slug, outputs]);

  // Auto-save history after idle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input && input.length > 20) saveToHistory(input);
    }, 3000);
    return () => clearTimeout(timer);
  }, [input, saveToHistory]);

  // Initial Sample Data & Magic Data Handling
  const lastSlug = useRef('');
  useEffect(() => {
    const magicData = localStorage.getItem('typeflow_magic_data');
    if (magicData) {
      setInput(magicData);
      localStorage.removeItem('typeflow_magic_data');
      if (geminiKey) {
        setTimeout(() => handleAiSmartParse(), 500);
      }
    } else if (lastSlug.current !== slug && !input) {
      const samples: any = {
        'json-to-typescript': JSON.stringify({
          id: "usr_9f82d1a3c7",
          username: "alex_architect",
          name: "Alex Mercer",
          email: "alex.mercer@devflow.io",
          status: "active",
          role: "Lead Systems Engineer",
          avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Alex",
          stats: {
            commits: 1242,
            repositories: 42,
            issuesClosed: 189
          },
          preferences: {
            theme: "dark",
            notifications: true,
            twoFactorEnabled: true
          },
          lastLogin: "2026-05-17T13:45:00Z"
        }, null, 2),
        'curl-to-fetch': `curl -X GET 'https://api.example.com/v1/users/usr_9f82d1a3c7' \\\n  -H 'Authorization: Bearer dev_token_xyz' \\\n  -H 'Content-Type: application/json'`,
        'sql-to-zod': `CREATE TABLE users (\n  id VARCHAR(36) PRIMARY KEY,\n  username VARCHAR(50) UNIQUE NOT NULL,\n  email VARCHAR(255) NOT NULL,\n  status VARCHAR(20) DEFAULT 'active',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`
      };
      setInput(samples[slug] || `{\n  "status": "ready",\n  "tool": "${slug}"\n}`);
    }
    lastSlug.current = slug;
  }, [slug, geminiKey]); // Removed handleAiSmartParse from dependency

  const tabs = [
    { id: 'typescript', label: 'TS' },
    { id: 'zod', label: 'Zod' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
    { id: 'python', label: 'Python' },
    { id: 'dart', label: 'Dart' },
    { id: 'php', label: 'PHP' },
    { id: 'java', label: 'Java' },
    { id: 'kotlin', label: 'Kotlin' },
    { id: 'swift', label: 'Swift' },
    { id: 'protobuf', label: 'Proto' },
    { id: 'graphql', label: 'GQL' },
    { id: 'sql', label: 'SQL' },
    { id: 'jsonschema', label: 'Schema' },
    { id: 'mock', label: 'Mock Data' },
    { id: 'ui', label: 'UI' },
    { id: 'doc', label: 'Doc' },
    { id: 'json', label: 'JSON' }
  ];

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] p-6 gap-6 bg-slate-50 dark:bg-[#030712]">
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Terminal size={14}/> Input Source
            </span>
            {hasParseError && (
              <button
                onClick={handleAiSchemaHeal}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white dark:hover:text-white transition-all animate-pulse"
                title="AI detects a syntax error. Click to auto-heal!"
              >
                <Sparkles size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                <span>Heal Schema</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-blue-600 bg-blue-600/5 dark:bg-blue-600/5 px-3 py-1.5 rounded-xl border border-blue-600/10 hover:bg-blue-600 hover:text-slate-950 transition-all"
            >
              <FolderOpen size={12} /> <span>Folder Bulk</span>
            </button>
            <button 
              onClick={handleAiSmartParse}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-blue-600 bg-blue-600/5 dark:bg-blue-600/5 px-3 py-1.5 rounded-xl border border-blue-600/10 hover:bg-blue-600 hover:text-slate-950 transition-all"
            >
              {isAiLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{aiStatus}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles size={12} />
                  <span>AI Smart Parse</span>
                </div>
              )}
            </button>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
              <select
                value={uiTheme}
                onChange={(e) => setUiTheme(e.target.value)}
                className="bg-transparent text-[10px] font-mono uppercase text-slate-600 dark:text-slate-300 px-2 py-1 outline-none cursor-pointer"
              >
                <option value="glassmorphism" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">✨ Glass</option>
                <option value="cyberpunk" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">⚡ Neon</option>
                <option value="minimalist" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🖤 Stark</option>
              </select>
            </div>
            <button 
              onClick={handleAiUiGenerate}
              disabled={isAiUiLoading}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-blue-600 bg-blue-600/5 dark:bg-blue-600/5 px-3 py-1.5 rounded-xl border border-blue-600/10 hover:bg-blue-600 hover:text-slate-950 transition-all disabled:opacity-50"
            >
              {isAiUiLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Synthesizing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-blue-600 animate-pulse" />
                  <span>AI UI Gen</span>
                </div>
              )}
            </button>
            <button onClick={() => setInput("")} className="text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={16}/>
            </button>
          </div>
        </div>

        {/* Recent History Chips */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
            <span className="flex items-center gap-1 text-[8px] font-mono uppercase text-slate-300 tracking-tighter shrink-0">
              <Clock size={10} /> History:
            </span>
            {history.map((h, i) => (
              <button 
                key={i}
                onClick={() => setInput(h.content)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 hover:text-blue-600 border border-transparent hover:border-blue-600/20 transition-all truncate max-w-[120px]"
                title={h.content.slice(0, 100)}
              >
                {h.content.trim().slice(0, 15)}...
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <Editor
            height="100%"
            theme={isDark ? "vs-dark" : "light"}
            defaultLanguage="json"
            value={input}
            onChange={(v) => setInput(v || "")}
            options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 24, bottom: 24 }, automaticLayout: true }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 max-w-[calc(100%-100px)]">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setOutputTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${outputTab === tab.id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowGenSettings(!showGenSettings)}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:text-blue-600 transition-all"
            >
              <Settings size={12} /> <span>Config</span>
            </button>
            <button 
              onClick={() => {
                const code = outputs[outputTab] || "";
                const prompt = `Here is a ${outputTab} definition. Please write a production-ready React component or service that utilizes this structure:\n\n\`\`\`${outputTab}\n${code}\n\`\`\``;
                navigator.clipboard.writeText(prompt);
                setToastMsg("Prompt Copied!");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
              }}
              className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase text-blue-600 bg-blue-600/5 dark:bg-blue-600/5 px-3 py-1.5 rounded-xl border border-blue-600/10 hover:bg-blue-600 hover:text-slate-950 transition-all"
            >
              <Zap size={12} /> <span>AI Prompt</span>
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(outputs[outputTab] || "");
                setIsCopied(true);
                setToastMsg(`${outputTab.toUpperCase()} Copied!`);
                setShowToast(true);
                setTimeout(() => {
                  setIsCopied(false);
                  setShowToast(false);
                }, 2000);
              }}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-white bg-slate-950 dark:bg-blue-600 dark:text-slate-950 px-4 py-1.5 rounded-xl shadow-lg hover:scale-[1.02] transition-all shrink-0"
            >
              <Copy size={12} /> <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden relative group">
          
          <AnimatePresence>
            {showGenSettings && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 right-4 z-[60] bg-white/95 dark:bg-slate-850/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-64"
              >
                <h4 className="text-[10px] font-mono uppercase text-slate-400 mb-4 tracking-wider">Code Generation Rules</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold dark:text-white cursor-pointer">
                    <input type="checkbox" checked={genSettings.exportDefault} onChange={e => setGenSettings(s => ({...s, exportDefault: e.target.checked}))} className="rounded text-blue-600 focus:ring-blue-600/20" />
                    Use `export default` (TS)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold dark:text-white cursor-pointer">
                    <input type="checkbox" checked={genSettings.optionalFields} onChange={e => setGenSettings(s => ({...s, optionalFields: e.target.checked}))} className="rounded text-blue-600 focus:ring-blue-600/20" />
                    Make all fields optional
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold dark:text-white cursor-pointer">
                    <input type="checkbox" checked={genSettings.useUUID} onChange={e => setGenSettings(s => ({...s, useUUID: e.target.checked}))} className="rounded text-blue-600 focus:ring-blue-600/20" />
                    Infer UUIDs for `*id` (Zod)
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {outputTab === 'ui' ? (
            <div className="w-full h-full p-2 overflow-hidden [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-layout]:rounded-xl [&_.sp-layout]:border-none [&_.sp-stack]:h-full">
              <Sandpack
                template="react-ts"
                theme={isDark ? "dark" : "light"}
                files={{
                  "/public/index.html": `<!DOCTYPE html>\n<html lang="en" class="${isDark ? 'dark' : ''}">\n  <head>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <script>tailwind.config = { darkMode: 'class' }</script>\n  </head>\n  <body class="bg-slate-50 dark:bg-slate-900">\n    <div id="root"></div>\n  </body>\n</html>`,
                  "/App.tsx": `import { ComponentCard } from './Component';\n\nexport default function App() {\n  const mockData = ${outputs['mock'] || '{}'};\n  return (\n    <div className="p-8 flex items-start justify-center min-h-screen">\n      <div className="w-full max-w-2xl">\n        <ComponentCard data={mockData} />\n      </div>\n    </div>\n  );\n}`,
                  "/Component.tsx": (outputs['ui'] || "export const ComponentCard = () => <div>No UI generated</div>;")
                }}
                options={{
                  editorHeight: "100%",
                  showLineNumbers: false,
                  showNavigator: false,
                  showTabs: true
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col relative">
              {outputTab === 'mock' && (
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 z-10 animate-fade-in">
                  <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Zap size={12} className="text-blue-600 animate-pulse" /> AI Data Synthesizer
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAiSynthesizeData}
                      disabled={isSynthesizing}
                      className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50 hover:bg-blue-700 dark:hover:bg-blue-700 hover:text-white dark:hover:text-white transition-all disabled:opacity-50"
                    >
                      {isSynthesizing ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          <span>Synthesizing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={10} className="text-blue-600 animate-pulse" />
                          <span>Synthesize 50 Rows</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={downloadMockJson}
                      className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600/25 transition-all"
                    >
                      <span>Download JSON</span>
                    </button>
                    <button
                      onClick={downloadMockCsv}
                      className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600/25 transition-all"
                    >
                      <span>Download CSV</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  theme={isDark ? "vs-dark" : "light"}
                  language={outputTab === 'doc' ? 'markdown' : outputTab}
                  value={outputs[outputTab] || "// Generate code..."}
                  options={{ 
                    minimap: { enabled: false }, 
                    fontSize: 13, 
                    readOnly: true, 
                    automaticLayout: true, 
                    padding: { top: 24, bottom: 24 },
                    wordWrap: 'on',
                    scrollbar: { vertical: 'auto', horizontal: 'auto' },
                    renderLineHighlight: 'none'
                  }}
                />
              </div>
            </div>
          )}
          
          {jsonData && (
            <div className="absolute bottom-6 right-6 w-80 max-h-80 overflow-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 no-scrollbar">
              <JsonVisualizer data={jsonData} />
            </div>
          )}
        </div>
      </div>
      <Toast isVisible={showToast} message={toastMsg} />
      {showBatchModal && (
        <SuperBatchModal
          isOpen={showBatchModal}
          slug={slug}
          isDark={isDark}
          genSettings={genSettings}
          isPro={isPro}
          setShowLicenseModal={setShowLicenseModal}
          onClose={() => setShowBatchModal(false)}
        />
      )}
    </div>
  );
}
