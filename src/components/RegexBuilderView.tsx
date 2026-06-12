import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Wand2, Copy, CheckCircle2, AlertCircle, Play, Code2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

export function RegexBuilderView({ 
  geminiKey, 
  setGeminiKey, 
  isPro, 
  trialCount, 
  setTrialCount 
}: { 
  geminiKey: string;
  setGeminiKey: (k: string) => void;
  isPro: boolean;
  trialCount: number;
  setTrialCount: (c: number) => void;
  isDark: boolean;
}) {
  const [intent, setIntent] = useState('Extract all email addresses that end with @gmail.com or @yahoo.com');
  const [regex, setRegex] = useState('');
  const [testStrings, setTestStrings] = useState('test@gmail.com\nhello@yahoo.com\ninvalid@hotmail.com\nuser.name@gmail.com');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!isPro && trialCount <= 0) {
      setError('Free trial limit reached. Please activate a Pro license to continue using Advanced AI features.');
      return;
    }
    if (!geminiKey) {
      setError('Please set your Gemini API Key in the top navigation first.');
      return;
    }
    
    setIsGenerating(true);
    setError('');

    try {
      if (!isPro) {
        const newCount = trialCount - 1;
        setTrialCount(newCount);
        localStorage.setItem('typemorph_trial_count', newCount.toString());
      }
      const prompt = `You are an expert developer. Generate ONLY a valid Regular Expression (regex) that does the following: "${intent}".
      Do not include any explanations, markdown backticks, or the wrapping / / characters. Just the raw pattern.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) throw new Error('API Error: ' + response.statusText);
      
      const data = await response.json();
      let resultText = data.candidates[0].content.parts[0].text;
      resultText = resultText.replace(/^\/|\/$/g, '').trim(); // Remove wrapping slashes if AI adds them
      
      setRegex(resultText);
    } catch (err: any) {
      setError(err.message || 'Failed to generate regex.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(regex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live Testing Logic
  const getMatchResults = () => {
    if (!regex) return [];
    try {
      const re = new RegExp(regex, 'gm');
      const lines = testStrings.split('\n');
      return lines.map(line => {
        re.lastIndex = 0; // reset for each line
        const isMatch = re.test(line);
        return { line, isMatch };
      });
    } catch (e) {
      return []; // Invalid regex state while typing
    }
  };

  const matchResults = getMatchResults();
  let isValidRegex = true;
  try { if (regex) new RegExp(regex); } catch { isValidRegex = false; }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto pt-32 pb-20 px-6 min-h-screen"
    >
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white">
          Smart Regex <span className="text-purple-600">AI</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          Describe what you want to extract or validate in plain English. Gemini AI generates the perfect Regular Expression, instantly testable.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle size={20} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Left Column: Generator */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Wand2 size={16} className="text-purple-500" /> Describe Your Intent
            </h3>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Match valid IPv4 addresses..."
              className="w-full h-32 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-purple-500 transition-all resize-none"
            />
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !intent}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? <Wand2 className="animate-spin" size={16} /> : <Play size={16} />}
                <span>Generate Regex</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Code2 size={16} /> Generated Pattern
              </span>
              <button 
                onClick={copyToClipboard}
                disabled={!regex}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                {copied ? <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-6">
              {!isValidRegex && regex && (
                <p className="text-red-500 dark:text-red-400 text-xs mb-2 flex items-center gap-1"><AlertCircle size={12}/> Invalid regex syntax</p>
              )}
              <div className="flex items-center font-mono text-lg break-all">
                <span className="text-slate-400 dark:text-slate-500 select-none">/</span>
                <input 
                  type="text" 
                  value={regex}
                  onChange={(e) => setRegex(e.target.value)}
                  placeholder="^pattern$"
                  className={`bg-transparent w-full outline-none font-bold ${!isValidRegex ? 'text-red-500 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}
                />
                <span className="text-slate-400 dark:text-slate-500 select-none">/gm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Testing */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col h-[500px]">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Live Test Data (One per line)</span>
          </div>
          <div className="flex-1 flex flex-col md:flex-row relative">
            <textarea
              value={testStrings}
              onChange={(e) => setTestStrings(e.target.value)}
              spellCheck="false"
              className="w-full h-full absolute inset-0 bg-transparent text-transparent caret-slate-900 dark:caret-white p-6 font-mono text-sm leading-relaxed resize-none outline-none z-10"
              style={{ lineHeight: '1.75rem' }}
            />
            <div className="w-full h-full absolute inset-0 p-6 font-mono text-sm leading-relaxed pointer-events-none z-0 overflow-y-auto">
              {testStrings.split('\n').map((line, i) => {
                const result = matchResults[i];
                return (
                  <div key={i} className="h-7 whitespace-pre overflow-hidden">
                    {line === '' ? <br/> : (
                      <span className={result?.isMatch ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1 rounded" : "text-slate-400"}>
                        {line}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
