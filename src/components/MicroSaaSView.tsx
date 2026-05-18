import React, { useState } from 'react';
import { AppWindow, Loader2, Wand2, Download } from 'lucide-react';
import { Sandpack } from '@codesandbox/sandpack-react';

interface Props {
  isDark: boolean;
  geminiKey: string;
  isPro: boolean;
  trialCount: number;
  setTrialCount: (c: number) => void;
}

export function MicroSaaSView({ isDark, geminiKey, isPro, trialCount, setTrialCount }: Props) {
  const [schemaInput, setSchemaInput] = useState(`{
  "billing_system": {
    "invoices": [
      {
        "invoice_id": "INV-2026-8910",
        "customer_name": "Acme Corp",
        "amount_usd": 4500.00,
        "status": "Paid",
        "issue_date": "2026-05-01",
        "due_date": "2026-05-31"
      },
      {
        "invoice_id": "INV-2026-8911",
        "customer_name": "Globex Inc",
        "amount_usd": 1250.50,
        "status": "Overdue",
        "issue_date": "2026-04-15",
        "due_date": "2026-05-15"
      }
    ]
  }
}`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!geminiKey && !isPro) {
      setError("Please set your Gemini API key or upgrade to PRO.");
      return;
    }
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `You are an expert Frontend Architect.
I will provide a data schema (JSON/SQL).
Your task is to generate a fully functional React Dashboard (CRUD UI) that manages this data.

Requirements:
1. Use React and TypeScript.
2. Use Tailwind CSS for beautiful, modern, enterprise-grade styling.
3. Use 'lucide-react' for icons.
4. Implement local state (useState) to simulate Create, Read, Update, Delete operations so the table is interactive.
5. Create a visually stunning layout with a sidebar, header, data table, and modal forms.
6. RETURN ONLY VALID JSON. Do not include markdown code block syntax outside the JSON. The JSON must have this structure:
{
  "/App.tsx": "import React... (the main dashboard exporting default App)",
  "/types.ts": "export interface..."
}

Schema:
${schemaInput}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey || process.env.NEXT_PUBLIC_GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const rawText = data.candidates[0].content.parts[0].text;
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const files = JSON.parse(cleaned);

      setGeneratedFiles(files);
      if (!isPro) setTrialCount(Math.max(0, trialCount - 1));
    } catch (err: any) {
      setError(err.message || "Failed to generate app. Please check your schema or API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedFiles) return;
    const blob = new Blob([JSON.stringify(generatedFiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'micro-saas-components.json';
    a.click();
  };

  return (
    <div className={`h-full flex flex-col p-6 ${isDark ? 'text-white' : 'text-slate-900'} overflow-y-auto`}>
      <div className="max-w-[1600px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              <AppWindow className="text-blue-600" size={24} /> 
              Micro-SaaS Engine <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-md text-[10px] ml-2">V5 BETA</span>
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-2">Instantly synthesize a fully functional React + Tailwind CRUD dashboard from any schema.</p>
          </div>
          {generatedFiles && (
            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all">
              <Download size={14} /> Export Source
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
          <div className="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden lg:col-span-1">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
              <span className="text-[10px] font-mono uppercase text-slate-500">Input Schema (JSON / SQL)</span>
            </div>
            <textarea
              className="flex-1 w-full bg-transparent p-4 text-xs font-mono outline-none resize-none"
              value={schemaInput}
              onChange={(e) => setSchemaInput(e.target.value)}
              placeholder="Paste your JSON or SQL schema here..."
            />
            <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
               <button
                 onClick={handleGenerate}
                 disabled={isGenerating}
                 className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
               >
                 {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                 {isGenerating ? 'Synthesizing...' : 'Generate Full-Stack App'}
               </button>
            </div>
          </div>
          
          <div className="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden lg:col-span-2">
            {!generatedFiles ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AppWindow size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-sm font-black text-slate-400 mb-2 uppercase tracking-widest">Live App Preview</h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Click &quot;Generate&quot; to synthesize the app. A fully functional React environment will boot up here via Sandpack.
                </p>
              </div>
            ) : (
              <div className="flex-1 w-full h-full [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-layout]:rounded-none [&_.sp-layout]:border-none">
                <Sandpack
                  template="react-ts"
                  theme={isDark ? "dark" : "light"}
                  files={{
                    ...generatedFiles,
                    "/public/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Micro-SaaS Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
                  }}
                  customSetup={{
                    dependencies: {
                      "lucide-react": "latest",
                      "date-fns": "latest"
                    }
                  }}
                  options={{
                    showNavigator: true,
                    showTabs: true,
                    editorHeight: "100%",
                    editorWidthPercentage: 40,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
