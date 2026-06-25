import React, { useState } from 'react';
import { Globe2, Loader2, Wand2, Download, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { callGeminiWithRetry } from '@/lib/gemini';

interface Props {
  isDark: boolean;
  geminiKey: string;
  isPro: boolean;
  trialCount: number;
  setTrialCount: (c: number) => void;
}

export function I18nView({ isDark, geminiKey, isPro, trialCount, setTrialCount }: Props) {
  const [sourceJson, setSourceJson] = useState(`{
  "auth": {
    "login_title": "Sign in to your account",
    "email_placeholder": "name@company.com",
    "forgot_password": "Forgot your password?",
    "submit_btn": "Authenticate",
    "error_invalid_creds": "The credentials provided are incorrect."
  },
  "dashboard": {
    "welcome_back": "Welcome back, {{name}}",
    "revenue_ytd": "Revenue (YTD)",
    "active_users": "Active Sessions",
    "export_csv": "Export as CSV",
    "delete_warning": "Are you sure you want to permanently delete this record? This action cannot be undone."
  }
}`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ja');
  const [error, setError] = useState<string | null>(null);

  const targetLanguages = [
    { code: 'ja', label: 'Japanese' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ko', label: 'Korean' },
    { code: 'fr', label: 'French' },
    { code: 'es', label: 'Spanish' }
  ];

  const handleGenerate = async () => {
    if (!geminiKey && !isPro) {
      setError("Please set your Gemini API key or upgrade to PRO.");
      return;
    }
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `You are an expert software localization engineer.
I will provide a source JSON file containing UI strings (primarily in English).
Your task is to translate these strings into 5 languages: Japanese (ja), Chinese Simplified (zh), Korean (ko), French (fr), and Spanish (es).
Maintain the exact same JSON keys. Do not translate the keys, only the values.
Pay attention to IT software context (e.g., "Authenticate" should be translated contextually accurate, not literally). Keep placeholders like {{name}} intact.

RETURN ONLY VALID JSON. Do not include markdown code block syntax outside the JSON. The JSON must have this exact structure:
{
  "ja": { ... },
  "zh": { ... },
  "ko": { ... },
  "fr": { ... },
  "es": { ... }
}

Source JSON:
${sourceJson}
`;

      const rawText = await callGeminiWithRetry(geminiKey, prompt, 0.1);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Convert objects to pretty strings
      const formattedResults: Record<string, string> = {};
      for (const lang of Object.keys(parsed)) {
        formattedResults[lang] = JSON.stringify(parsed[lang], null, 2);
      }

      setResults(formattedResults);
      setActiveTab('ja');
      if (!isPro) setTrialCount(Math.max(0, trialCount - 1));
    } catch (err: any) {
      setError(err.message || "Failed to generate localization. Please check your JSON schema or API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSingle = (lang: string) => {
    if (!results || !results[lang]) return;
    const blob = new Blob([results[lang]], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lang}.json`;
    a.click();
  };

  const handleDownloadAll = () => {
    if (!results) return;
    // A simple way to download multiple without jszip is triggering multiple downloads with a slight delay
    Object.keys(results).forEach((lang, index) => {
      setTimeout(() => {
        handleDownloadSingle(lang);
      }, index * 200);
    });
  };

  return (
    <div className={`h-full flex flex-col p-6 ${isDark ? 'text-white' : 'text-slate-900'} overflow-y-auto`}>
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              <Globe2 className="text-slate-700 dark:text-white" size={24} />
              i18n Auto-Gen
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-2">Instantly translate your source dictionary into 5 global languages with high-context software accuracy.</p>
          </div>
          {results && (
            <button onClick={handleDownloadAll} className="flex items-center gap-2 px-4 py-2 text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <Download size={14} /> Download All (5 files)
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
          {/* Input Section */}
          <div className="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
              <span className="text-[10px] font-mono uppercase text-slate-500">Source Dictionary (JSON)</span>
            </div>
            <textarea
              className="flex-1 w-full bg-transparent p-4 text-xs font-mono outline-none resize-none"
              value={sourceJson}
              onChange={(e) => setSourceJson(e.target.value)}
              placeholder="Paste your source JSON here..."
            />
            <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
               <button
                 onClick={handleGenerate}
                 disabled={isGenerating}
                 className="w-full py-3 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
               >
                 {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                 {isGenerating ? 'Translating into 5 languages...' : 'Generate Localizations'}
               </button>
            </div>
          </div>
          
          {/* Output Section */}
          <div className="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
            {!results ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Globe2 size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-sm font-black text-slate-400 mb-2 uppercase tracking-widest">Global Output</h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Click &quot;Generate&quot; to synthesize Context-Aware JSON dictionaries for Japanese, Chinese, Korean, French, and Spanish simultaneously.
                </p>
              </div>
            ) : (
              <>
                <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex gap-2 overflow-x-auto no-scrollbar">
                  {targetLanguages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setActiveTab(lang.code)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === lang.code ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                    >
                      {lang.label} ({lang.code})
                    </button>
                  ))}
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <textarea
                    readOnly
                    value={results[activeTab] || ''}
                    className="w-full h-full bg-transparent p-4 text-xs font-mono outline-none resize-none text-slate-700 dark:text-slate-300"
                  />
                  <button 
                    onClick={() => handleDownloadSingle(activeTab)}
                    className="absolute bottom-4 right-4 p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                    title={`Download ${activeTab}.json`}
                  >
                    <Download size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
