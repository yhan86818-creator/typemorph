'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, FileCode, CheckCircle2, Loader2, Play, 
  Crown, X, Terminal, FolderCheck, AlertCircle, RefreshCw 
} from 'lucide-react';
import { runEngine, parseXML, parseYAML } from '@/lib/engine';

interface SuperBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  genSettings: any;
  isDark: boolean;
  isPro?: boolean;
  setShowLicenseModal?: (show: boolean) => void;
}

export default function SuperBatchModal({ 
  isOpen, 
  onClose, 
  slug, 
  genSettings, 
  isDark, 
  isPro = false, 
  setShowLicenseModal 
}: SuperBatchModalProps) {
  const [step, setStep] = useState<'idle' | 'loaded' | 'processing' | 'done'>('idle');
  const [inputDirName, setInputDirName] = useState('');
  const [outputDirName, setOutputDirName] = useState('');
  const [foundFiles, setFoundFiles] = useState<FileSystemFileHandle[]>([]);
  const [targetLang, setTargetLang] = useState('typescript');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [inputDirHandle, setInputDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [outputDirHandle, setOutputDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Determine input extension based on slug
  const getInputExtension = (): string => {
    if (slug.includes('xml')) return '.xml';
    if (slug.includes('yaml') || slug.includes('yml')) return '.yaml';
    if (slug.includes('curl')) return '.txt';
    if (slug.includes('sql')) return '.sql';
    return '.json';
  };

  const extension = getInputExtension();

  // Language mapping
  const langs = [
    { id: 'typescript', label: 'TypeScript', ext: '.ts' },
    { id: 'zod', label: 'Zod Schema', ext: '.zod.ts' },
    { id: 'go', label: 'Go Lang', ext: '.go' },
    { id: 'rust', label: 'Rust', ext: '.rs' },
    { id: 'python', label: 'Python', ext: '.py' },
    { id: 'dart', label: 'Dart', ext: '.dart' },
    { id: 'php', label: 'PHP', ext: '.php' },
    { id: 'java', label: 'Java', ext: '.java' },
    { id: 'kotlin', label: 'Kotlin', ext: '.kt' },
    { id: 'swift', label: 'Swift', ext: '.swift' },
    { id: 'protobuf', label: 'Protobuf', ext: '.proto' },
    { id: 'graphql', label: 'GraphQL', ext: '.graphql' },
    { id: 'sql', label: 'SQL DDL', ext: '.sql' },
    { id: 'jsonschema', label: 'JSON Schema', ext: '.schema.json' },
    { id: 'mock', label: 'Mock Data', ext: '.mock.json' }
  ];

  const getExtForLang = (langId: string) => {
    return langs.find(l => l.id === langId)?.ext || '.txt';
  };

  // Recurse directories to find matches
  const scanDir = async (dirHandle: FileSystemDirectoryHandle, ext: string, list: FileSystemFileHandle[] = []) => {
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'file') {
        if (entry.name.toLowerCase().endsWith(ext.toLowerCase())) {
          list.push(entry);
        }
      } else if (entry.kind === 'directory') {
        await scanDir(entry, ext, list);
      }
    }
    return list;
  };

  // Select Input Folder
  const handleSelectInputFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setInputDirHandle(handle);
      setInputDirName(handle.name);
      
      setLogs([`🔍 Scanning directory "${handle.name}" for *${extension} files...`]);
      const files = await scanDir(handle, extension);
      setFoundFiles(files);
      
      setLogs(prev => [
        ...prev, 
        `✨ Scan completed. Found ${files.length} match(es) with *${extension} extension.`
      ]);
      setStep('loaded');
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
      }
    }
  };

  // Select Output Folder
  const handleSelectOutputFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setOutputDirHandle(handle);
      setOutputDirName(handle.name);
      setLogs(prev => [...prev, `📂 Output directory set to "${handle.name}".`]);
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        setLogs(prev => [...prev, `❌ Error setting output directory: ${err.message}`]);
      }
    }
  };

  // Run Batch Processing
  const handleRunBatch = async () => {
    if (!inputDirHandle || !outputDirHandle || foundFiles.length === 0) return;

    // Pro制限: 非Proユーザーは3ファイルまで
    if (!isPro && foundFiles.length > 3) {
      if (confirm(`Free version is limited to 3 files at a time. Upgrade to Pro to process all ${foundFiles.length} files?`)) {
        onClose();
        if (setShowLicenseModal) setShowLicenseModal(true);
      }
      return;
    }

    setStep('processing');
    setProgress(0);
    const startTime = performance.now();
    setLogs(prev => [...prev, `🚀 Starting batch transformation of ${foundFiles.length} files...`]);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < foundFiles.length; i++) {
      const fileHandle = foundFiles[i];
      setLogs(prev => [...prev, `⏳ Transforming [${i + 1}/${foundFiles.length}] ${fileHandle.name}...`]);

      try {
        const file = await fileHandle.getFile();
        const content = await file.text();

        // 1. Parsing into raw JSON
        let jsonObj: any = null;
        const trimmed = content.trim();
        
        if (extension === '.xml') {
          const xmlResult = parseXML(trimmed);
          if (!xmlResult || Object.keys(xmlResult).length === 0) throw new Error('Invalid or empty XML.');
          jsonObj = xmlResult;
        } else if (extension === '.yaml' || extension === '.yml') {
          const yamlResult = parseYAML(trimmed);
          if (!yamlResult || Object.keys(yamlResult).length === 0) throw new Error('Invalid or empty YAML.');
          jsonObj = yamlResult;
        } else {
          jsonObj = JSON.parse(trimmed);
        }

        if (!jsonObj) throw new Error("Parsed object is empty or invalid format.");

        // 2. Run conversion engine
        const converted = runEngine(jsonObj, targetLang, slug, genSettings);

        // 3. Write file
        const outFileName = fileHandle.name.replace(/\.[^/.]+$/, "") + getExtForLang(targetLang);
        const newFileHandle = await outputDirHandle.getFileHandle(outFileName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(converted);
        await writable.close();

        successCount++;
        setLogs(prev => [...prev, `✅ Converted and saved: ${outFileName}`]);
      } catch (err: any) {
        failCount++;
        console.error(err);
        setLogs(prev => [...prev, `❌ Failed to convert ${fileHandle.name}: ${err.message}`]);
      }

      setProgress(Math.round(((i + 1) / foundFiles.length) * 100));
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    setElapsedTime(Number(duration));
    setStep('done');
    setLogs(prev => [
      ...prev,
      `🏁 Batch processing complete in ${duration}s!`,
      `📊 Summary: ${successCount} Succeeded | ${failCount} Failed`
    ]);
  };

  const handleReset = () => {
    setStep('idle');
    setInputDirName('');
    setOutputDirName('');
    setFoundFiles([]);
    setProgress(0);
    setLogs([]);
    setInputDirHandle(null);
    setOutputDirHandle(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-600/20">
                <Crown size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-md font-black dark:text-white flex items-center gap-2">
                  Folder Bulk Mode
                  <span className="text-[9px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">Enterprise folder-to-folder schema mass transformation</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Step 1: Idle - Select Directory */}
            {step === 'idle' && (
              <div className="space-y-6 text-center py-8">
                <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500 border border-blue-100 dark:border-blue-900">
                  <FolderOpen size={32} />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="text-sm font-black dark:text-white">Choose Input Directory</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select a folder on your local computer containing your schema files. We will automatically recursively scan for files matching <span className="font-extrabold text-blue-500">*{extension}</span>.
                  </p>
                  <p className="text-[10px] bg-emerald-500/10 text-emerald-500 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20 font-bold inline-block mt-2">
                    🔒 Privacy-First: All computation runs completely in your browser. Zero server uploads.
                  </p>
                </div>
                <button
                  onClick={handleSelectInputFolder}
                  className="flex items-center gap-2 mx-auto text-xs font-black uppercase text-white bg-blue-600 dark:bg-blue-600 px-6 py-3 rounded-2xl shadow-xl shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <FolderOpen size={16} />
                  Select Source Folder
                </button>
              </div>
            )}

            {/* Step 2: Loaded - Configure & Run */}
            {step === 'loaded' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source Folder Summary */}
                  <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <FolderCheck size={12} className="text-emerald-500" /> Source folder
                    </span>
                    <h5 className="text-xs font-black dark:text-white truncate" title={inputDirName}>📂 {inputDirName}</h5>
                    <p className="text-[11px] text-slate-400 font-bold">Found: {foundFiles.length} file(s) with {extension}</p>
                  </div>

                  {/* Target Language Selection */}
                  <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <FileCode size={12} className="text-blue-500" /> Target Language
                    </span>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold dark:text-white outline-none focus:border-blue-500"
                    >
                      {langs.map(l => (
                        <option key={l.id} value={l.id}>{l.label} ({l.ext})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Output Folder Selector */}
                <div className="p-5 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/20">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      📁 Output Folder
                    </span>
                    <h5 className="text-xs font-black dark:text-white">
                      {outputDirName ? `📂 ${outputDirName}` : "No output folder selected"}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-medium">Where to save the newly converted files.</p>
                  </div>
                  <button
                    onClick={handleSelectOutputFolder}
                    className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shrink-0"
                  >
                    <FolderOpen size={14} />
                    {outputDirName ? "Change Folder" : "Select Output"}
                  </button>
                </div>

                {/* Submit Action */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={handleReset}
                    className="text-xs font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-950/20 px-5 py-2.5 rounded-2xl hover:text-slate-600 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleRunBatch}
                    disabled={!outputDirHandle || foundFiles.length === 0}
                    className="flex items-center gap-2 text-xs font-black uppercase text-white bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 px-6 py-2.5 rounded-2xl shadow-xl shadow-blue-600/10 hover:scale-[1.02] disabled:scale-100 transition-all"
                  >
                    <Play size={12} fill="currentColor" />
                    Run Mass Conversion
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Processing & Step 4: Done */}
            {(step === 'processing' || step === 'done') && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black dark:text-white uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      {step === 'processing' ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-blue-600" />
                          <span>Converting files...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span>Mass Conversion Completed!</span>
                        </>
                      )}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="bg-gradient-to-r from-blue-600 to-yellow-400 h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Terminal Console Logs */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Terminal size={14} /> Execution logs
                  </span>
                  <div className="h-60 rounded-3xl bg-slate-950 border border-slate-900 p-4 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-1.5 shadow-inner relative no-scrollbar">
                    {logs.map((log, index) => (
                      <div key={index} className="leading-relaxed whitespace-pre-wrap">
                        {log}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>

                {/* Done Step Footer Info */}
                {step === 'done' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} />
                      <div className="text-left">
                        <h5 className="text-xs font-black uppercase tracking-wider">Done!</h5>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          All files processed. Check output folder: <span className="font-extrabold">{outputDirName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-500 text-white px-3.5 py-2 rounded-xl shadow-lg hover:scale-105 transition-all"
                      >
                        <RefreshCw size={10} /> Convert Another
                      </button>
                      <button
                        onClick={onClose}
                        className="text-[9px] font-black uppercase border border-emerald-500/30 text-emerald-500 px-3.5 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors"
                      >
                        Close Window
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
