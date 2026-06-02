'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import Editor, { useMonaco } from '@monaco-editor/react';
import LZString from 'lz-string';
import { 
  Terminal, Share2, Copy, FileJson, Sparkles, Settings, Loader2, Monitor, Trash2, Code2, Zap, Crown, Upload, ChevronDown,
  Lightbulb, Edit3, Check, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  runEngine, parseYAML, parseXML, parseCurl, curlToTypeScript, parseSQLToZod, getDecisions, type Decision 
} from '@/lib/engine';
import { compareSchemas, type SchemaDiff } from '@/lib/diff';
import {
  trackWorkbenchOpen,
  trackConvertSuccess,
  trackProClick,
  shouldReportConvert,
} from '@/lib/analytics';
import { processPii } from '@/lib/privacy';
import { JsonVisualizer, Toast } from './SharedUI';
import { History as HistoryIcon, Clock, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import SuperBatchModal from './SuperBatchModal';
import dynamic from 'next/dynamic';
const TypeGraphPanel = dynamic(() => import('./TypeGraphPanel'), { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">Loading graph…</div> });

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
  onCursorChange?: (pos: { x: number, y: number }) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
  onEditorError?: (error: string | null) => void;
}

const PRESETS = [
  {
    label: 'SWIFT MT103',
    data: "{1:F01BANKDEFMAXXX2039063581}{2:O1031609050901BANKDEFXAXXX89549812080509011609N}{4:\n:20:005600204\n:23B:CRED\n:32A:050901EUR100000,\n:33B:EUR100000,\n:50K:/12345678\nJOHN DOE\nMAIN STREET 1\n1000 BRUSSELS\n:59:/87654321\nJANE SMITH\nHIGH STREET 2\n2000 ANTWERP\n:71A:SHA\n-}"
  },
  {
    label: 'Team Project',
    data: {
      "project_name": "TypeFlow Pro",
      "owner": {
        "id": "usr_99",
        "details": {
          "first_name": "Kouki",
          "last_name": "Dev",
          "contact": {
            "email": "kouki@example.com",
            "phone": "+81-00-0000"
          }
        },
        "location": {
          "city": "Tokyo",
          "street": "Shibuya 1-2-3",
          "zip": "150-0002"
        },
        "created_at": "2026-05-19T00:00:00Z",
        "updated_at": "2026-05-19T10:00:00Z"
      },
      "team_members": [
        {
          "id": "usr_101",
          "info": {
            "first_name": "Alex",
            "last_name": "Smith",
            "contact": {
              "email": "alex@example.com",
              "phone": "+1-555-0199"
            }
          },
          "address": {
            "city": "New York",
            "street": "5th Ave",
            "zip": "10001"
          },
          "role": "admin",
          "status": "active",
          "created_at": "2026-05-18T00:00:00Z",
          "updated_at": "2026-05-18T12:00:00Z"
        },
        {
          "id": "usr_102",
          "info": {
            "first_name": "Sarah",
            "last_name": "Connor",
            "contact": {
              "email": "sarah@example.com",
              "phone": "+1-555-0100"
            }
          },
          "address": {
            "city": "Los Angeles",
            "street": "Sunset Blvd",
            "zip": "90001"
          },
          "role": "guest",
          "status": "pending",
          "created_at": "2026-05-17T09:00:00Z",
          "updated_at": "2026-05-17T09:00:00Z"
        }
      ]
    }
  },
  {
    label: 'E-commerce Order',
    data: {
      orderId: "ord_1029384756",
      customerId: "cust_394857",
      items: [
        {
          productId: "prod_001",
          name: "Mechanical Keyboard",
          price: 189.99,
          quantity: 1,
          attributes: { color: "graphite", switch: "brown" }
        },
        {
          productId: "prod_004",
          name: "Coiled Cable USB-C",
          price: 34.50,
          quantity: 2,
          attributes: { color: "neon-pink" }
        }
      ],
      totalAmount: 258.99,
      currency: "USD",
      paymentStatus: "paid",
      shippingAddress: {
        street: "128 Innovation Way",
        city: "San Francisco",
        state: "CA",
        zip: "94107",
        country: "USA"
      },
      createdAt: "2026-05-18T10:00:00Z"
    }
  },
  {
    label: 'GitHub API Response',
    data: {
      id: 29837482,
      node_id: "MDEwOlJlcG9zaXRvcnkyOTgzNzQ4Mg==",
      name: "typeflow-pro",
      full_name: "devflow-labs/typeflow-pro",
      private: false,
      owner: {
        login: "devflow-labs",
        id: 9384758,
        avatar_url: "https://avatars.githubusercontent.com/u/9384758?v=4",
        type: "Organization",
        site_admin: false
      },
      html_url: "https://github.com/devflow-labs/typeflow-pro",
      description: "Elite developer-centric architectural schema converter and model synthesizer.",
      fork: false,
      stargazers_count: 8742,
      watchers_count: 8742,
      language: "TypeScript",
      has_issues: true,
      has_projects: false,
      has_downloads: true,
      has_wiki: true,
      has_pages: true,
      forks_count: 342,
      archived: false,
      disabled: false,
      open_issues_count: 14,
      license: {
        key: "mit",
        name: "MIT License",
        spdx_id: "MIT",
        url: "https://api.github.com/licenses/mit"
      },
      allow_forking: true,
      is_template: false,
      topics: ["typescript", "json-converter", "schema-inference", "zod", "prisma"],
      visibility: "public"
    }
  }
];

export function Workbench({ slug, isDark, geminiKey, outputTab, setOutputTab, isPro, setShowLicenseModal, trialCount = 3, setTrialCount, user, onCursorChange, onEmptyChange, onEditorError }: WorkbenchProps) {
  const monaco = useMonaco();
  const [input, setInput] = useState(slug === 'json-to-typescript' ? (typeof PRESETS[1].data === 'string' ? PRESETS[1].data : JSON.stringify(PRESETS[1].data, null, 2)) : '');
  const inputModelUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (onEmptyChange) {
      onEmptyChange(!input.trim());
    }
  }, [input, onEmptyChange]);

  // Feature 1: Error Patrol - Listen for markers (errors) using useMonaco hook
  useEffect(() => {
    if (!monaco || !onEditorError) return;

    // The correct event on the global monaco object is onDidChangeMarkers
    const disposable = monaco.editor.onDidChangeMarkers((uris) => {
      if (inputModelUriRef.current) {
        // Check if the current model's URI is in the list of changed URIs
        const currentUri = monaco.Uri.parse(inputModelUriRef.current);
        const isChanged = uris.some(uri => uri.toString() === currentUri.toString());
        
        if (isChanged || uris.length === 0) { // uris.length === 0 sometimes happens on clear
          const markers = monaco.editor.getModelMarkers({ resource: currentUri });
          const errors = markers.filter((m: any) => m.severity === monaco.MarkerSeverity.Error);
          if (errors.length > 0) {
            onEditorError(errors[0].message);
          } else {
            onEditorError(null);
          }
        }
      }
    });

    return () => disposable.dispose();
  }, [monaco, onEditorError]);
  const [leftWidth, setLeftWidth] = useState(50); // percentage (25% - 75%)
  const [isResizing, setIsResizing] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const previousLeftWidthRef = useRef(50);

  const toggleLeftPanel = useCallback(() => {
    if (isLeftCollapsed) {
      setLeftWidth(previousLeftWidthRef.current);
      setIsLeftCollapsed(false);
    } else {
      previousLeftWidthRef.current = leftWidth;
      setIsLeftCollapsed(true);
    }
  }, [isLeftCollapsed, leftWidth]);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const containerLeft = containerRef.current.getBoundingClientRect().left;
    const relativeX = e.clientX - containerLeft;
    const percentage = Math.max(25, Math.min(75, (relativeX / containerWidth) * 100));
    setLeftWidth(percentage);
  }, [isResizing]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing, resize, stopResize]);

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
  const [isZodGenerating, setIsZodGenerating] = useState(false);
  const [hasParseError, setHasParseError] = useState(false);
  const [showMobileLangs, setShowMobileLangs] = useState(false);
  const [saveCloudHistory, setSaveCloudHistory] = useState<boolean>(true);
  const [lastWipedContent, setLastWipedContent] = useState<string>("");
  const [isSharing, setIsSharing] = useState(false);
  const [localFileHandle, setLocalFileHandle] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const IS_BETA = true; // ベータ期間中はtrueに設定
  const [isProLicensed, setIsProLicensed] = useState(IS_BETA);

  const handleSelectSyncFile = async () => {
    if (!isProLicensed) {
      setShowPaywall(true);
      return;
    }
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${slug || 'output'}.${outputTab === 'typescript' ? 'ts' : outputTab === 'rust' ? 'rs' : outputTab}`,
      });
      setLocalFileHandle(handle);
      setToastMsg("Local Sync Active! 📁");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error(e);
    }
  };

  useEffect(() => {
    const sync = async () => {
      if (!localFileHandle || !isProLicensed) return;
      const content = outputs[outputTab];
      if (!content) return;

      try {
        setIsSyncing(true);
        const writable = await localFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (e) {
        console.error("Sync failed:", e);
        setLocalFileHandle(null); // エラー時は解除
      } finally {
        setIsSyncing(false);
      }
    };
    sync();
  }, [outputs[outputTab], localFileHandle, isProLicensed]);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  
  // Freemium States
  const INITIAL_TRIAL_COUNT = 3; 
  const BASIC_TRIAL_LIMIT = 50;
  const [localTrialCount, setLocalTrialCount] = useState(INITIAL_TRIAL_COUNT);
  const [basicTrialCount, setBasicTrialCount] = useState(BASIC_TRIAL_LIMIT);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hideEmptyState, setHideEmptyState] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('typeflow_save_cloud_history');
      if (saved !== null) {
        setTimeout(() => setSaveCloudHistory(saved === 'true'), 0);
      }
      
      // ベータ版でない場合のみローカル証明書をチェック
      if (!IS_BETA) {
        const cert = localStorage.getItem('typeflow_pro_cert');
        if (cert) {
          setTimeout(() => setIsProLicensed(true), 0);
        }
      }

      // ... (trial reset logic remains same for counting, but won't block Pro in beta)
    }
  }, [IS_BETA]);
  const handleSaveCloudHistoryChange = (val: boolean) => {
    setSaveCloudHistory(val);
    localStorage.setItem('typeflow_save_cloud_history', String(val));
  };


  const [showGenSettings, setShowGenSettings] = useState(false);
  const [genSettings, setGenSettings] = useState({
    exportDefault: false,
    optionalFields: false,
    useUUID: true,
    sharedPrefix: 'Shared',
    disabledUnifications: [] as string[],
    customTypeNames: {} as Record<string, string>,
    extractTimestamps: true,
    flattenWrappers: true,
  });

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showDecisions, setShowDecisions] = useState(true);
  const [previousJsonData, setPreviousJsonData] = useState<any>(null);
  const [schemaDiffs, setSchemaDiffs] = useState<SchemaDiff[]>([]);
  const baselineJsonRef = useRef<any>(null);

  const acceptNewBaseline = () => {
    if (jsonData) {
      baselineJsonRef.current = jsonData;
      setSchemaDiffs([]);
      setToastMsg("Schema baseline updated!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const resetBaseline = (newObj: any) => {
    baselineJsonRef.current = newObj;
    setSchemaDiffs([]);
  };

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const outputEditorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const highlightDecisionInCode = (decision: Decision) => {
    if (!outputEditorRef.current || !monacoRef.current) return;
    
    try {
      const text = outputEditorRef.current.getValue();
      const lines = text.split('\n');
      let foundLineIndex = -1;
      
      let term = "";
      if (decision.type === 'unification') {
        term = decision.meta.semanticName || "";
      } else if (decision.type === 'timestamp') {
        term = "TimestampModel";
      } else if (decision.type === 'flattening') {
        term = "envelope"; 
        const match = decision.description.match(/into (\w+)/i);
        if (match) {
          term = match[1];
        }
      }

      if (!term) return;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(term)) {
          foundLineIndex = i;
          break;
        }
      }

      if (foundLineIndex !== -1) {
        outputEditorRef.current.revealLineInCenter(foundLineIndex + 1);
        
        const range = new monacoRef.current.Range(
          foundLineIndex + 1,
          1,
          foundLineIndex + 1,
          lines[foundLineIndex].length + 1
        );
        
        decorationsRef.current = outputEditorRef.current.deltaDecorations(
          decorationsRef.current,
          [
            {
              range: range,
              options: {
                isWholeLine: true,
                className: 'monaco-highlight-line',
                marginClassName: 'bg-blue-500/20'
              }
            }
          ]
        );
      }
    } catch (e) {
      console.error("Error highlighting line in Monaco:", e);
    }
  };

  const clearDecisionHighlight = () => {
    if (outputEditorRef.current && monacoRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = outputEditorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  };

  const handleActivatePro = async (providedKey?: string) => {
    const targetKey = (providedKey || licenseKeyInput).trim();
    if (!targetKey) {
      setLicenseError("License key is required.");
      return;
    }
    setIsVerifying(true);
    setLicenseError("");
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: targetKey })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('typeflow_pro_cert', data.token);
        localStorage.setItem('typeflow_license_key', targetKey);
        setIsProLicensed(true);
        setLicenseKeyInput("");
        if (!providedKey) {
          setToastMsg("Pro Subscription Activated! ✨");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      } else {
        if (!providedKey) {
          setLicenseError(data.error || "Invalid license key.");
        } else {
          // サイレント更新に失敗した場合、ライセンスを無効化
          localStorage.removeItem('typeflow_pro_cert');
          setIsProLicensed(false);
        }
      }
    } catch (e) {
      if (!providedKey) {
        setLicenseError("Network error. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // JWTの有効期限チェックユーティリティ
  const isTokenExpired = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp < (Date.now() / 1000);
    } catch (e) {
      return true;
    }
  };

  useEffect(() => {
    const checkLicense = async () => {
      const cert = localStorage.getItem('typeflow_pro_cert');
      const savedKey = localStorage.getItem('typeflow_license_key');
      
      if (cert) {
        if (isTokenExpired(cert)) {
          if (savedKey) {
            // トークンが切れているがキーがある場合、バックグラウンドで再認証
            await handleActivatePro(savedKey);
          } else {
            setIsProLicensed(false);
          }
        } else {
          setIsProLicensed(true);
        }
      }
    };
    checkLicense();
  }, []);

  // Helper to consume trial and check paywall
  const checkAndConsumeTrial = (): boolean => {
    if (isProLicensed) return true; // Pro版は無制限
    if (localTrialCount > 0) {
      const newCount = localTrialCount - 1;
      setLocalTrialCount(newCount);
      localStorage.setItem('typeflow_trial_count', String(newCount));
      
      // トライアル消費のトースト通知
      setToastMsg(`Free Trial Used (${newCount} left today)`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      return true;
    }
    // トライアル切れの場合はペイウォールを表示して実行ブロック
    setShowPaywall(true);
    return false;
  };

  const checkAndConsumeBasicTrial = (): boolean => {
    if (isProLicensed) return true;
    if (basicTrialCount > 0) {
      const newCount = basicTrialCount - 1;
      setBasicTrialCount(newCount);
      localStorage.setItem('typeflow_basic_trial_count', String(newCount));
      return true;
    }
    setShowPaywall(true);
    return false;
  };


  // Hydrate data from URL hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#data=')) {
        try {
          const compressed = hash.substring(6);
          const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
          if (decompressed) {
            setTimeout(() => setInput(decompressed), 0);
          }
        } catch (e) {
          console.error('Failed to decompress state from URL hash', e);
        }
      }
    }
  }, []);

  // Hydrate data from cloud share (?share=<id>) on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !supabase) return;
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (!shareId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('shared_schemas')
          .select('compressed_data')
          .eq('id', shareId)
          .single();

        if (error || !data?.compressed_data) {
          console.error('Failed to load shared schema:', error);
          return;
        }

        const decompressed = LZString.decompressFromEncodedURIComponent(data.compressed_data);
        if (decompressed) {
          setInput(decompressed);
          // Clean ?share= from URL after loading so sharing is non-intrusive
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {
        console.error('Supabase hydration error:', e);
      }
    })();
  }, []);

  // NOTE: Auto-sync to URL is intentionally REMOVED.
  // State is written to URL ONLY when the user explicitly presses the Share button.
  // This preserves the Privacy Manifesto: data never leaves the browser unless explicitly shared.

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem('typeflow_gen_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => setGenSettings(prev => ({
          ...prev,
          ...parsed,
          disabledUnifications: parsed.disabledUnifications || [],
          customTypeNames: parsed.customTypeNames || {},
          extractTimestamps: parsed.extractTimestamps !== false,
          flattenWrappers: parsed.flattenWrappers !== false,
        })), 0);
      } catch(e) {}
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('typeflow_gen_settings', JSON.stringify(genSettings));
  }, [genSettings]);

  useEffect(() => {
    if (jsonData) {
      const list = getDecisions(jsonData, genSettings);
      setTimeout(() => setDecisions(list), 0);
    } else {
      setTimeout(() => setDecisions([]), 0);
    }
  }, [jsonData, genSettings]);

  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);

  const outputTabRef = useRef(outputTab);
  useEffect(() => { outputTabRef.current = outputTab; }, [outputTab]);

  const taskIdRef = useRef(0);

  useEffect(() => {
    trackWorkbenchOpen(slug);
  }, [slug]);

  const reportConvertIfNew = useCallback(
    (trimmed: string, lang: string) => {
      const fingerprint = `${slug}:${lang}:${trimmed.length}:${trimmed.slice(0, 64)}`;
      if (shouldReportConvert(fingerprint)) {
        trackConvertSuccess(slug, lang);
      }
    },
    [slug]
  );

  const handleAiSmartParse = useCallback(async () => {
    if (!checkAndConsumeTrial()) return;

    // PII Detection & Masking
    const piiResult = processPii(inputRef.current, isProLicensed);
    let finalInput = inputRef.current;

    if (piiResult.detectedTypes.length > 0) {
      if (!isProLicensed) {
        const proceed = window.confirm(
          `⚠️ Privacy Warning: We detected sensitive data (${piiResult.detectedTypes.join(', ')}) in your input.\n\nFree users send data as-is. Upgrade to Pro for automatic local masking before sending to AI.\n\nDo you want to proceed anyway?`
        );
        if (!proceed) return;
      } else {
        finalInput = piiResult.maskedText;
        setToastMsg("Privacy Shield: Sensitive data masked! 🔒");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }

    if (!geminiKey) {
      if (window.confirm("Gemini API Key is required for AI Smart Parse.\n\nWould you like to get a FREE API Key from Google AI Studio right now?\n\n(Click 'Cancel' to run local Demo mode)")) {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
        return;
      }
      setIsAiLoading(true);
      setAiStatus("Demo Mode: Formatting...");
      setTimeout(() => {
        try {
          const fixed = finalInput.replace(/[']/g, '"').replace(/,\s*([\]}])/g, '$1');
          const parsed = JSON.parse(fixed);
          setInput(JSON.stringify(parsed, null, 2));
          setToastMsg("Demo: Healed!");
        } catch(e) {
          setToastMsg("Demo: Needs real AI!");
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        setIsAiLoading(false);
        setAiStatus("");
      }, 1000);
      return;
    }
    setIsAiLoading(true);
    try {
      setAiStatus("Analyzing structure...");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Clean this input into valid minified JSON. If it's a log, extract the primary object. Return ONLY the JSON: ${finalInput}` }] }]
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

  // ─── Streaming helper ────────────────────────────────────────────────────
  const streamGemini = useCallback(async function* (prompt: string): AsyncGenerator<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok || !res.body) throw new Error(`Gemini API error: ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) yield chunk;
        } catch { /* skip malformed chunks */ }
      }
    }
  }, [geminiKey]);

  const handleAiUiGenerate = useCallback(async () => {
    if (!checkAndConsumeTrial()) return;

    // PII Detection & Masking
    const piiResult = processPii(inputRef.current, isProLicensed);
    let finalInput = inputRef.current;
    if (piiResult.detectedTypes.length > 0) {
      if (!isProLicensed) {
        if (!window.confirm("⚠️ Privacy Warning: Detected sensitive data. Proceed without masking?")) return;
      } else {
        finalInput = piiResult.maskedText;
        setToastMsg("Privacy Shield: Sensitive data masked! 🔒");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }

    if (!geminiKey) {
      if (window.confirm("Gemini API Key is required to generate custom UI.\n\nWould you like to get a FREE API Key from Google AI Studio right now?\n\n(Click 'Cancel' to view a Demo UI)")) {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
        return;
      }
      setIsAiUiLoading(true);
      setTimeout(() => {
        const demoCode = `import React from 'react';\n\nexport const ComponentCard = ({ data }) => {\n  return (\n    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg flex items-center space-x-4">\n      <div className="shrink-0">\n        <div className="h-12 w-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">D</div>\n      </div>\n      <div>\n        <div className="text-xl font-medium text-black">Demo Component</div>\n        <p className="text-slate-500">Add a Gemini API Key to generate real custom UIs!</p>\n      </div>\n    </div>\n  );\n};`;
        setOutputs((prev: any) => ({ ...prev, ui: demoCode }));
        setOutputTab('ui');
        setToastMsg("Demo UI Loaded!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        setIsAiUiLoading(false);
      }, 1000);
      return;
    }
    const targetData = jsonData || finalInput;
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

      // Show output tab immediately so user sees streaming
      setOutputTab('ui');
      setOutputs((prev: any) => ({ ...prev, ui: '' }));

      let accumulated = '';
      for await (const chunk of streamGemini(prompt)) {
        accumulated += chunk;
        setOutputs((prev: any) => ({ ...prev, ui: accumulated }));
      }

      // Strip markdown fences at the end
      const match = accumulated.match(/```(?:tsx|ts|jsx|js)?\n([\s\S]*?)```/i);
      const finalText = match ? match[1].trim() : accumulated.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      setOutputs((prev: any) => ({ ...prev, ui: finalText }));

      setToastMsg('Premium UI Created!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e: any) {
      console.error(e);
      alert(`AI UI Generation failed: ${e.message || 'Invalid API response'}`);
    } finally {
      setIsAiUiLoading(false);
    }
  }, [geminiKey, input, jsonData, uiTheme, setOutputTab, isProLicensed, streamGemini]);

  const handleAiSynthesizeData = useCallback(async () => {
    if (!checkAndConsumeTrial()) return;

    // PII Detection & Masking
    const piiResult = processPii(inputRef.current, isProLicensed);
    let finalInput = inputRef.current;
    if (piiResult.detectedTypes.length > 0) {
      if (!isProLicensed) {
        if (!window.confirm("⚠️ Privacy Warning: Detected sensitive data. Proceed without masking?")) return;
      } else {
        finalInput = piiResult.maskedText;
        setToastMsg("Privacy Shield: Sensitive data masked! 🔒");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }

    if (!geminiKey) {
      if (window.confirm("Gemini API Key is required for Data Synthesis.\n\nWould you like to get a FREE API Key from Google AI Studio right now?\n\n(Click 'Cancel' to view Demo Data)")) {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
        return;
      }
      setIsSynthesizing(true);
      setTimeout(() => {
        const demoData = Array(5).fill(0).map((_, i) => ({
          id: `demo_${i + 1}`,
          status: "demo_mode",
          message: "Please add an API key for real synthesis."
        }));
        setOutputs((prev: any) => ({ ...prev, mock: JSON.stringify(demoData, null, 2) }));
        setToastMsg("Demo Data Generated!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        setIsSynthesizing(false);
      }, 1000);
      return;
    }
    const targetData = jsonData || finalInput;
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

      // Show output tab immediately and stream raw JSON text
      setOutputTab('mock');
      setOutputs((prev: any) => ({ ...prev, mock: '' }));

      let accumulated = '';
      for await (const chunk of streamGemini(prompt)) {
        accumulated += chunk;
        setOutputs((prev: any) => ({ ...prev, mock: accumulated }));
      }

      // Clean up markdown fences then parse JSON
      const rawText = accumulated.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      try {
        const parsed = JSON.parse(rawText);
        const finalText = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed], null, 2);
        setOutputs((prev: any) => ({ ...prev, mock: finalText }));
        setToastMsg('Synthesized 50 Global Rows!');
      } catch {
        // Try to extract JSON array even from dirty output
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setOutputs((prev: any) => ({ ...prev, mock: JSON.stringify(parsed, null, 2) }));
          setToastMsg('Synthesized 50 Global Rows!');
        } else {
          setToastMsg('Warning: Output may not be valid JSON.');
        }
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e: any) {
      console.error(e);
      alert(`Synthesis failed: ${e.message || 'Invalid API response'}`);
    } finally {
      setIsSynthesizing(false);
    }
  }, [geminiKey, input, jsonData, isProLicensed, streamGemini]);

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

  const handleAiSemanticZod = useCallback(async () => {
    if (!checkAndConsumeTrial()) return;

    // PII Detection & Masking
    const piiResult = processPii(inputRef.current, isProLicensed);
    let finalInput = inputRef.current;
    if (piiResult.detectedTypes.length > 0) {
      if (!isProLicensed) {
        if (!window.confirm("⚠️ Privacy Warning: Detected sensitive data. Proceed without masking?")) return;
      } else {
        finalInput = piiResult.maskedText;
        setToastMsg("Privacy Shield: Sensitive data masked! 🔒");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }

    if (!geminiKey) {
      if (window.confirm("Gemini API Key is required for Semantic Zod Validation.\n\nWould you like to get a FREE API Key from Google AI Studio right now?\n\n(Click 'Cancel' to view Demo Zod)")) {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
        return;
      }
      setIsZodGenerating(true);
      setTimeout(() => {
        const demoZod = `import { z } from "zod";\n\n// DEMO: Add API Key for real semantic validation\nexport const DemoSchema = z.object({\n  email: z.string().email(),\n  age: z.number().min(18)\n});`;
        setOutputs((prev: any) => ({ ...prev, zod: demoZod }));
        setOutputTab('zod');
        setToastMsg("Demo Semantic Zod Generated!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        setIsZodGenerating(false);
      }, 1000);
      return;
    }
    const targetData = jsonData || finalInput;
    if (!targetData) {
      alert("Please enter some input data first.");
      return;
    }
    setIsZodGenerating(true);
    try {
      const prompt = `
        You are an Expert TypeScript Security Engineer.
        TASK: Create an advanced, semantically correct Zod validation schema for the following JSON data.
        
        DATA STRUCTURE:
        ${typeof targetData === 'string' ? targetData : JSON.stringify(targetData, null, 2)}
        
        RULES:
        1. Do NOT just output z.string() or z.number(). Infer the SEMANTIC meaning.
        2. If a key is 'email', use z.string().email().
        3. If a key is 'url' or 'website', use z.string().url().
        4. If a key is 'uuid' or 'id', use z.string().uuid() if it looks like one.
        5. If a date string, use z.string().datetime() or z.coerce.date().
        6. Add reasonable .min(), .max(), .positive() where it makes logical sense (e.g. age, price).
        7. Only output the valid TypeScript Zod code. No markdown formatting.
      `;

      // Show output tab immediately
      setOutputTab('zod');
      setOutputs((prev: any) => ({ ...prev, zod: '' }));

      let accumulated = '';
      for await (const chunk of streamGemini(prompt)) {
        accumulated += chunk;
        setOutputs((prev: any) => ({ ...prev, zod: accumulated }));
      }

      // Strip markdown fences
      const finalText = accumulated.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      setOutputs((prev: any) => ({ ...prev, zod: finalText }));

      setToastMsg('Semantic Zod Generated!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e: any) {
      console.error(e);
      alert(`Generation failed: ${e.message || 'Invalid API response'}`);
    } finally {
      setIsZodGenerating(false);
    }
  }, [geminiKey, input, jsonData, isProLicensed, streamGemini]);

  const handleAiSchemaHeal = useCallback(async () => {
    if (!checkAndConsumeTrial()) return;

    // PII Detection & Masking
    const piiResult = processPii(inputRef.current, isProLicensed);
    let finalInput = inputRef.current;
    if (piiResult.detectedTypes.length > 0) {
      if (!isProLicensed) {
        if (!window.confirm("⚠️ Privacy Warning: Detected sensitive data. Proceed without masking?")) return;
      } else {
        finalInput = piiResult.maskedText;
        setToastMsg("Privacy Shield: Sensitive data masked! 🔒");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }

    if (!geminiKey) {
      if (window.confirm("Gemini API Key is required to heal schemas.\n\nWould you like to get a FREE API Key from Google AI Studio right now?\n\n(Click 'Cancel' to run local Demo mode)")) {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
        return;
      }
      setIsAiLoading(true);
      setAiStatus("Demo Mode: Healing...");
      setTimeout(() => {
        setToastMsg("Demo: Real AI required for complex healing.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        setIsAiLoading(false);
        setAiStatus("");
      }, 1000);
      return;
    }
    if (!finalInput.trim()) return;
    setIsAiLoading(true);
    setAiStatus("Healing syntax...");
    try {
      const prompt = `
        You are an Elite Code and Schema Healing Engine.
        TASK: Fix any broken syntax (missing commas, unclosed quotes, unbalanced brackets, trailing commas, or truncated lines) in the following text.
        Ensure the output is 100% syntactically correct and well-formatted based on its apparent type (JSON, SQL, XML, or YAML).
        
        INPUT TO HEAL:
        ${finalInput}
        
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
  }, [geminiKey, input, isProLicensed]);

  const processInput = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setHasParseError(false);
      return;
    }

    // 基本変換の回数制限チェック
    if (!checkAndConsumeBasicTrial()) return;

    const res: any = {};
    let jsonObj: any = null;
    let success = false;
    
    if (trimmed.toLowerCase().startsWith('curl')) {
      try {
        const parsed = parseCurl(trimmed);
        res.hook = curlToTypeScript(parsed);
        if (parsed.bodyJson) {
          jsonObj = parsed.bodyJson;
          success = true;
        } else if (res.hook) {
          success = true;
          reportConvertIfNew(trimmed, 'hook');
        }
      } catch (e) {}
    } 
    else if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
      try {
        res.zod = parseSQLToZod(trimmed);
        if (res.zod) {
          success = true;
          reportConvertIfNew(trimmed, 'zod');
        }
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
        setHasParseError(false);
        
        // Calculate schema diffs
        if (baselineJsonRef.current) {
          try {
            const diffs = compareSchemas(baselineJsonRef.current, jsonObj);
            setSchemaDiffs(diffs);
          } catch (e) {
            console.error(e);
          }
        } else {
          baselineJsonRef.current = jsonObj;
          setSchemaDiffs([]);
        }
        const activeLang = outputTabRef.current || 'typescript';
        const taskId = ++taskIdRef.current;
        
        // 1. Immediately calculate the active tab to make it feel instant!
        res[activeLang] = runEngine(jsonObj, activeLang, slug, genSettings);
        res.json = JSON.stringify(jsonObj, null, 2);
        
        // Update the active tab output immediately!
        setOutputs((prev: any) => ({ 
          ...prev, 
          [activeLang]: res[activeLang], 
          json: res.json 
        }));

        // 2. Queue the remaining languages in the background asynchronously
        const langs = ['typescript', 'zod', 'go', 'rust', 'java', 'python', 'dart', 'php', 'protobuf', 'graphql', 'swift', 'kotlin', 'sql', 'jsonschema', 'mock', 'ui', 'doc'].filter(l => l !== activeLang);
        
        const generateBackground = async () => {
          for (const lang of langs) {
            await new Promise(r => setTimeout(r, 0)); // Yield to main thread to prevent UI freeze
            if (taskId !== taskIdRef.current) return; // Cancel if obsolete
            const compiled = runEngine(jsonObj, lang, slug, genSettings);
            if (taskId !== taskIdRef.current) return; // Cancel if obsolete
            setOutputs((prev: any) => ({ ...prev, [lang]: compiled }));
          }
        };
        generateBackground();
        reportConvertIfNew(trimmed, activeLang);
        return;
      }
    }
    setOutputs(res);
    setHasParseError(!success);
  }, [input, slug, genSettings, reportConvertIfNew]);

  useEffect(() => { 
    const len = input.length;
    let delay = 300;
    if (len > 50000) delay = 2000;
    else if (len > 10000) delay = 1000;
    else if (len > 1000) delay = 600;

    const timer = setTimeout(() => {
      processInput();
    }, delay);

    return () => clearTimeout(timer);
  }, [processInput, input.length]);

  useEffect(() => {
    const saved = localStorage.getItem('typeflow_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => setHistory(parsed), 0);
      } catch (e) {
        console.warn('typeflow_history corrupted, clearing.', e);
        localStorage.removeItem('typeflow_history');
      }
    }
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

    // Save to Supabase (for logged in users, if cloud sync is enabled)
    if (user && saveCloudHistory && supabase) {
      try {
        const { error } = await supabase
          .from('conversion_history')
          .insert([{ 
            user_id: user.id, 
            tool_slug: slug, 
            input_data: content, 
            output_data: JSON.stringify(outputs) 
          }]);
        
        if (error) console.error('Error saving to Supabase:', error);
      } catch (e) {
        console.error('Supabase history save error:', e);
      }
    }
  }, [user, slug, outputs, saveCloudHistory]);

  // Hybrid Smart Share: URL hash for small payloads, Supabase for large ones.
  // Data NEVER leaves the browser unless the user explicitly clicks this button.
  const handleSmartShare = useCallback(async () => {
    if (!input) {
      alert("Please enter some input data first.");
      return;
    }
    setIsSharing(true);
    try {
      const compressed = LZString.compressToEncodedURIComponent(input);
      const candidateUrl = `${window.location.origin}${window.location.pathname}#data=${compressed}`;

      // URL-safe threshold: keep well below browser/sharing-tool limits
      const URL_LIMIT = 2000;

      if (candidateUrl.length <= URL_LIMIT) {
        // --- Mode 1: URL Hash (100% Private, no server involved) ---
        window.history.replaceState(null, '', `#data=${compressed}`);
        await navigator.clipboard.writeText(candidateUrl);
        setToastMsg("🔒 Private Link Copied! (URL Mode)");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        // --- Mode 2: Cloud Share (Supabase) — only on explicit user action ---
        if (!supabase) {
          alert("Your schema is too large for a URL link.\n\nCloud sharing requires Supabase to be configured.\nFor now, copying the raw URL (may be truncated in some apps).");
          await navigator.clipboard.writeText(candidateUrl);
          return;
        }

        const { data, error } = await supabase
          .from('shared_schemas')
          .insert([{
            slug,
            compressed_data: compressed,
            created_at: new Date().toISOString(),
          }])
          .select('id')
          .single();

        if (error || !data?.id) throw new Error(error?.message || "Failed to save to cloud.");

        const shortUrl = `${window.location.origin}${window.location.pathname}?share=${data.id}`;
        await navigator.clipboard.writeText(shortUrl);
        setToastMsg("☁️ Cloud Link Copied! (Schema stored securely)");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Share failed: ${e.message}`);
    } finally {
      setIsSharing(false);
    }
  }, [input, slug]);

  // Auto-save history after idle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input && input.length > 20 && input !== lastWipedContent) {
        saveToHistory(input);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [input, saveToHistory, lastWipedContent]);

  // Initial Sample Data & Magic Data Handling
  const lastSlug = useRef('');
  useEffect(() => {
    const magicData = localStorage.getItem('typeflow_magic_data');
    if (magicData) {
      setTimeout(() => {
        setInput(magicData);
        localStorage.removeItem('typeflow_magic_data');
        if (geminiKey) {
          setTimeout(() => handleAiSmartParse(), 500);
        }
      }, 0);
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
      setTimeout(() => {
        setInput(samples[slug] || `{\n  "status": "ready",\n  "tool": "${slug}"\n}`);
      }, 0);
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
    { id: 'playground', label: '⚡ Run' },
    { id: 'graph', label: 'Graph' },
    { id: 'doc', label: 'Doc' },
    { id: 'json', label: 'JSON' }
  ];

  return (
    <div 
      ref={containerRef}
      style={{ 
        ['--left-width' as any]: isLeftCollapsed ? '0%' : `${leftWidth}%`,
        ['--right-width' as any]: isLeftCollapsed ? '100%' : `${100 - leftWidth}%`
      }}
      className={`flex flex-col md:flex-row h-[calc(100vh-80px)] p-6 bg-slate-50 dark:bg-[#020617] relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}
    >
      <div 
        className={`flex flex-col min-w-0 h-full transition-all duration-300 ease-in-out overflow-hidden ${isLeftCollapsed ? 'w-0 md:w-0 opacity-0 pointer-events-none' : 'w-full md:flex-none md:w-[calc(var(--left-width)-12px)] opacity-100'}`}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 tracking-wider flex items-center gap-1.5 font-bold">
              <Terminal size={14} className="text-slate-400 dark:text-slate-300" /> Input Source
            </span>
            {geminiKey ? (
              <span className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900/50 animate-pulse font-bold">
                ✨ AI Mode (BYOK Cloud)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50 font-bold">
                🔒 Local Mode (100% Private)
              </span>
            )}
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
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
            >
              <FolderOpen size={12} /> <span>Folder Bulk</span>
            </button>
            <button 
              onClick={handleAiSmartParse}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
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
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all">
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
              className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-1.5 rounded-xl border border-transparent shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isAiUiLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Synthesizing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-white animate-pulse" />
                  <span>AI UI Gen</span>
                </div>
              )}
            </button>
            <button 
              onClick={() => { setInput(""); setHideEmptyState(true); resetBaseline(null); }} 
              className="flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/30 active:scale-95 transition-all"
              title="Clear Editor"
            >
              <Trash2 size={14}/>
            </button>
          </div>
        </div>

        {/* Presets and History Chips */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="flex items-center gap-1 text-[8px] font-mono uppercase text-slate-500 dark:text-slate-350 tracking-wider shrink-0 font-bold">
              <Zap size={10} className="text-yellow-500 animate-pulse" /> Presets:
            </span>
            {PRESETS.map((p, i) => (
              <button 
                key={i}
                onClick={() => { setInput(typeof p.data === 'string' ? p.data : JSON.stringify(p.data, null, 2)); resetBaseline(p.data); }}
                className="px-2.5 py-1 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 text-[9px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>
          
          {(() => {
            const filteredHistory = history.filter(h => h.content.trim() !== input.trim());
            return filteredHistory.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="flex items-center gap-1 text-[8px] font-mono uppercase text-slate-500 dark:text-slate-350 tracking-wider shrink-0 font-bold">
                  <Clock size={10} /> History:
                </span>
                {filteredHistory.map((h, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setInput(h.content);
                      try {
                        const parsed = JSON.parse(h.content);
                        resetBaseline(parsed);
                      } catch (e) {
                        resetBaseline(null);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 hover:text-blue-600 border border-transparent hover:border-blue-600/20 transition-all truncate max-w-[120px] shrink-0"
                    title={h.content.slice(0, 100)}
                  >
                    {h.content.trim().slice(0, 15)}...
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        <div 
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (evt) => {
                const content = evt.target?.result as string;
                if (content) setInput(content);
              };
              reader.readAsText(file);
            }
          }}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
              if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const content = evt.target?.result as string;
                    if (content) setInput(content);
                  };
                  reader.readAsText(file);
                }
              }
            }
          }}
          className="flex-1 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-xl shadow-xl dark:shadow-black/40 border border-slate-200 dark:border-slate-700/50 overflow-hidden relative group/editor"
        >
          <Editor
            height="100%"
            theme={isDark ? "vs-dark" : "light"}
            defaultLanguage="json"
            value={input}
            onChange={(v) => {
              setInput(v || "");
              if (v && hideEmptyState) setHideEmptyState(false);
              if (lastWipedContent) setLastWipedContent("");
            }}
            onMount={(editor, monaco) => {
              // Store input model URI for reliable marker detection
              const model = editor.getModel();
              if (model) {
                inputModelUriRef.current = model.uri.toString();
              }

              editor.onDidChangeCursorPosition(() => {
                if (onCursorChange) {
                  const position = editor.getPosition();
                  if (position) {
                    const coords = editor.getScrolledVisiblePosition(position);
                    const layout = editor.getLayoutInfo();
                    if (coords && layout) {
                      // Normalize cursor position (0 to 1)
                      onCursorChange({
                        x: coords.left / layout.width,
                        y: coords.top / layout.height
                      });
                    }
                  }
                }
              });
            }}
            options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 24, bottom: 24 }, automaticLayout: true }}
          />

          {/* Empty State Overlay */}
          {!input && !hideEmptyState && (
            <div className="absolute inset-0 bg-slate-50/95 dark:bg-slate-950/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto no-scrollbar">
              {/* Dashed drop area */}
              <div 
                className="w-full max-w-lg border-2 border-dashed border-slate-300 dark:border-blue-500/20 rounded-2xl p-8 flex flex-col items-center gap-4 bg-white/40 dark:bg-slate-900/40 hover:border-blue-500 dark:hover:border-blue-500/80 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group/drop cursor-pointer"
                onClick={() => {
                  const fileInput = document.createElement('input');
                  fileInput.type = 'file';
                  fileInput.accept = '.json,.xml,.yaml,.yml,.txt';
                  fileInput.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        if (content) setInput(content);
                      };
                      reader.readAsText(file);
                    }
                  };
                  fileInput.click();
                }}
              >
                <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 dark:text-blue-400 group-hover/drop:scale-110 transition-transform duration-300">
                  <Upload size={32} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 font-sans">
                    Drag & Drop Schema File
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300 max-w-xs mx-auto font-sans">
                    Supports JSON, XML, YAML, SQL or cURL format. Click to browse local files.
                  </p>
                </div>
              </div>

              {/* Preset Cards */}
              <div className="mt-8 w-full max-w-xl">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 tracking-wider block mb-4 font-bold">
                  Or Quick Start with Architectural Samples:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(typeof p.data === 'string' ? p.data : JSON.stringify(p.data, null, 2))}
                      className="flex flex-col items-start p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all text-left group"
                    >
                      <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold mb-1 flex items-center gap-1">
                        <Zap size={10} className="text-yellow-500" /> Preset {i + 1}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-500 transition-colors font-sans">
                        {p.label}
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 block leading-tight font-sans">
                        {p.label === 'SWIFT MT103' && 'Raw SWIFT MT103 customer credit transfer message.'}
                        {p.label === 'Team Project' && 'Complex deep nesting, arrays, ISO dates, location.'}
                        {p.label === 'E-commerce Order' && 'Product arrays, currencies, shipping info.'}
                        {p.label === 'GitHub API Response' && 'Deep organization details, repositories, arrays.'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setHideEmptyState(true)}
                className="mt-8 px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center gap-2 font-sans shadow-sm"
              >
                <Code2 size={16} /> Open Empty Editor for Pasting
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resizable Divider with Collapse Toggle (Only visible on md+ screens) */}
      <div 
        className="hidden md:flex flex-col items-center justify-center h-full shrink-0 relative select-none"
        style={{ width: isLeftCollapsed ? '24px' : '24px' }}
      >
        {/* Toggle button */}
        <button
          onClick={toggleLeftPanel}
          className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all group/toggle"
          title={isLeftCollapsed ? 'Show input panel' : 'Hide input panel'}
        >
          {isLeftCollapsed ? (
            <PanelLeftOpen size={14} className="text-slate-400 dark:text-slate-500 group-hover/toggle:text-blue-600 dark:group-hover/toggle:text-blue-400 transition-colors" />
          ) : (
            <PanelLeftClose size={14} className="text-slate-400 dark:text-slate-500 group-hover/toggle:text-blue-600 dark:group-hover/toggle:text-blue-400 transition-colors" />
          )}
        </button>

        {/* Drag handle line (hidden when collapsed) */}
        {!isLeftCollapsed && (
          <div 
            onMouseDown={startResize}
            className="w-6 h-full cursor-col-resize flex items-center justify-center group"
            title="Drag to resize panes"
          >
            <div className={`w-[2px] h-full transition-all duration-150 ${isResizing ? 'bg-blue-600 dark:bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.8)] scale-x-125' : 'bg-slate-200 dark:bg-slate-800/80 group-hover:bg-blue-500/50 dark:group-hover:bg-blue-500/50'}`} />
          </div>
        )}
      </div>

      <div className={`flex flex-col min-w-0 h-full transition-all duration-300 ease-in-out ${isLeftCollapsed ? 'w-full md:flex-1' : 'w-full md:flex-none md:w-[calc(var(--right-width)-12px)]'}`}>
        <div className="flex justify-between items-center mb-3">
          {/* Desktop tabs navigation */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 max-w-[calc(100%-100px)]">
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

          {/* Mobile bottom sheet trigger button */}
          <button 
            onClick={() => setShowMobileLangs(true)}
            className="md:hidden flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/40 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 hover:bg-blue-600 hover:text-white transition-all shrink-0 active:scale-95"
          >
            <span>{tabs.find(t => t.id === outputTab)?.label || outputTab.toUpperCase()}</span>
            <ChevronDown size={12} />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSelectSyncFile}
              className={`flex items-center gap-1.5 text-[10px] font-mono uppercase px-3 py-1.5 rounded-xl border transition-all shadow-sm ${localFileHandle ? 'bg-blue-600 text-white border-blue-500 animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400'}`}
              title={localFileHandle ? `Syncing to: ${localFileHandle.name}` : "Sync to local file (Auto-save)"}
            >
              <FolderOpen size={12} /> <span>{localFileHandle ? 'Syncing' : 'Sync'}</span>
            </button>
            <button 
              onClick={handleSmartShare}
              disabled={isSharing}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-50 shadow-sm"
              title="Copy shareable link (auto-selects URL or Cloud based on size)"
            >
              {isSharing ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
              <span>{isSharing ? 'Sharing...' : 'Share'}</span>
            </button>
            <button 
              onClick={() => {
                setShowGenSettings(!showGenSettings);
              }}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
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
              className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/50 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-all shadow-sm"
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
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-white bg-slate-950 dark:bg-blue-600 dark:text-white px-4 py-1.5 rounded-xl shadow-lg hover:scale-[1.02] transition-all shrink-0"
            >
              <Copy size={12} /> <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-xl shadow-xl dark:shadow-black/40 border border-slate-200 dark:border-slate-700/50 overflow-hidden relative group">
          
          <AnimatePresence>
            {showGenSettings && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 right-4 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-64"
              >
                <h4 className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-4 tracking-wider">Code Generation Rules</h4>
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

                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Shared Type Prefix</span>
                    <input 
                      type="text" 
                      placeholder="e.g. Shared, Common, or empty" 
                      value={genSettings.sharedPrefix !== undefined ? genSettings.sharedPrefix : 'Shared'} 
                      onChange={e => setGenSettings(s => ({...s, sharedPrefix: e.target.value}))} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-500/50 transition-all font-sans"
                    />
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3">
                    <h5 className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-wider flex items-center gap-1.5">
                      <Crown size={12} className="text-yellow-500" /> TypeFlow Pro License
                    </h5>
                    {isProLicensed ? (
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg mb-3">
                        <Crown size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Pro Subscription Active</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 mb-3">
                        <input 
                          type="password" 
                          placeholder="Enter License Key (e.g. TF-PRO-...)" 
                          value={licenseKeyInput} 
                          onChange={e => setLicenseKeyInput(e.target.value)} 
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-500/50 transition-all font-mono"
                        />
                        {licenseError && <p className="text-[9px] text-red-500">{licenseError}</p>}
                        <button 
                          onClick={() => handleActivatePro()}
                          disabled={isVerifying}
                          className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-blue-600/20"
                        >
                          {isVerifying ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
                          <span>Activate Pro</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3">
                    <h5 className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-wider flex items-center gap-1.5">
                      {IS_BETA ? "Beta Access Status" : "Subscription Status"}
                    </h5>
                    {IS_BETA ? (
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold px-2 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                        ✨ Full Access Unlocked for Beta
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-500 dark:text-slate-400">
                        {isProLicensed ? "Your lifetime license is active." : "Free version with limited features."}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3">
                    <h5 className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-wider">Privacy & Data Control</h5>
                    <label className="flex items-center gap-2 text-xs font-bold dark:text-white cursor-pointer mb-3">
                      <input type="checkbox" checked={saveCloudHistory} onChange={e => handleSaveCloudHistoryChange(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-600/20" />
                      Save History to Cloud (Supabase)
                    </label>

                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to completely wipe all local conversion history? This cannot be undone.")) {
                          localStorage.removeItem('typeflow_history');
                          setHistory([]);
                          setLastWipedContent(input);
                          setToastMsg("Local History Wiped!");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }
                      }}
                      className="w-full mb-2 flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 py-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    >
                      Wipe Local History
                    </button>

                    <button 
                      onClick={() => {
                        if (window.location.hash) {
                          window.history.replaceState(null, '', window.location.pathname + window.location.search);
                          setToastMsg("URL Hash Parameter Wiped!");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase text-slate-600 dark:text-slate-350 bg-slate-100 dark:bg-slate-800/80 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-all active:scale-95"
                    >
                      Wipe URL State
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {outputTab === 'graph' ? (
            <div className="w-full h-full p-0 overflow-hidden bg-slate-50 dark:bg-[#0f172a]">
              <TypeGraphPanel tsCode={outputs['typescript'] || ""} isDark={isDark} />
            </div>
          ) : ['ui', 'playground'].includes(outputTab) ? (
            <div className="w-full h-full p-2 overflow-hidden [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-layout]:rounded-xl [&_.sp-layout]:border-none [&_.sp-stack]:h-full">
              <Sandpack
                template="react-ts"
                theme={isDark ? "dark" : "light"}
                files={outputTab === 'ui' ? {
                  "/public/index.html": `<!DOCTYPE html>\n<html lang="en" class="${isDark ? 'dark' : ''}">\n  <head>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <script>tailwind.config = { darkMode: 'class' }</script>\n  </head>\n  <body class="bg-slate-50 dark:bg-slate-900">\n    <div id="root"></div>\n  </body>\n</html>`,
                  "/App.tsx": `import { ComponentCard } from './Component';\n\nexport default function App() {\n  const mockData = ${outputs['mock'] || '{}'};\n  return (\n    <div className="p-8 flex items-start justify-center min-h-screen">\n      <div className="w-full max-w-2xl">\n        <ComponentCard data={mockData} />\n      </div>\n    </div>\n  );\n}`,
                  "/Component.tsx": (outputs['ui'] || "export const ComponentCard = () => <div>No UI generated</div>;")
                } : {
                  "/public/index.html": `<!DOCTYPE html>\n<html lang="en" class="${isDark ? 'dark' : ''}">\n  <head>\n    <script src="https://cdn.tailwindcss.com"></script>\n  </head>\n  <body class="bg-slate-50 dark:bg-[#0b0f19]">\n    <div id="root"></div>\n  </body>\n</html>`,
                  "/App.tsx": `import React, { useState } from 'react';\nimport { Root } from './types';\nimport mockData from './mockData';\n\nexport default function App() {\n  // ⚡ Write type-safe React code here!\n  // Try changing properties to trigger typescript compiler check errors in real-time.\n  const [data, setData] = useState<Root>(mockData as Root);\n\n  return (\n    <div className="p-6 font-sans leading-relaxed text-slate-800 dark:text-slate-100 min-h-screen bg-slate-50 dark:bg-[#0b0f19]">\n      <h2 className="text-lg font-black text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">\n        ⚡ TypeFlow Live Playground\n      </h2>\n      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">\n        The inferred interfaces are loaded in <code>types.ts</code>. Change variable bindings in <code>App.tsx</code> to see compile validation checks!\n      </p>\n      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">\n        <h4 className="text-xs font-bold text-slate-450 mb-2">Injected State Data:</h4>\n        <pre className="text-[10px] overflow-auto max-h-48 bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-850 font-mono text-slate-800 dark:text-slate-200">\n          {JSON.stringify(data, null, 2)}\n        </pre>\n      </div>\n    </div>\n  );\n}`,
                  "/types.ts": (outputs['typescript'] || "export interface Root {}"),
                  "/mockData.ts": `const mockData = ${outputs['mock'] || '{}'};\nexport default mockData;`
                }}
                options={{
                  editorHeight: "100%",
                  showLineNumbers: true,
                  showNavigator: false,
                  showTabs: true
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col relative">
              {outputTab === 'mock' && (
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/50 z-10 animate-fade-in">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 tracking-wider flex items-center gap-1.5 font-bold">
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
              {outputTab === 'zod' && (
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/50 z-10 animate-fade-in">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 tracking-wider flex items-center gap-1.5 font-bold">
                    <Sparkles size={12} className="text-emerald-500 animate-pulse" /> Semantic Validator
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAiSemanticZod}
                      disabled={isZodGenerating}
                      className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-700 dark:hover:bg-emerald-700 hover:text-white dark:hover:text-white transition-all disabled:opacity-50"
                    >
                      {isZodGenerating ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={10} className="text-emerald-600 animate-pulse" />
                          <span>AI Deep Validation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Schema Migration Impact Analyzer */}
              {!['json', 'ui', 'mock', 'doc', 'graph'].includes(outputTab) && schemaDiffs.length > 0 && (
                <div className="bg-amber-50/40 dark:bg-amber-950/10 border-b border-amber-200 dark:border-amber-950/30 p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-amber-500/10 text-amber-500">
                        <Zap size={12} className="animate-pulse" />
                      </span>
                      <span className="font-mono uppercase tracking-wider text-[10px] text-slate-700 dark:text-slate-350 font-bold">
                        Schema Migration Impact ({schemaDiffs.length} Change{schemaDiffs.length > 1 ? 's' : ''} Detected)
                      </span>
                    </div>
                    <button 
                      onClick={acceptNewBaseline}
                      className="text-[9px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white px-2.5 py-1 rounded border border-amber-250 dark:border-amber-900/50 transition-all shadow-sm cursor-pointer"
                      title="Set current schema as the new baseline Reference"
                    >
                      Accept Changes (Set Baseline)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 max-h-36 overflow-y-auto no-scrollbar pb-1">
                    {schemaDiffs.map((diff, index) => {
                      const severityColors = {
                        error: 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400',
                        warning: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-750 dark:text-amber-400',
                        info: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-750 dark:text-blue-400'
                      };

                      const severityBadges = {
                        error: '⚡ Breaking',
                        warning: '⚠️ Warning',
                        info: '✨ Added'
                      };

                      return (
                        <div 
                          key={index} 
                          className={`p-3 rounded-xl border flex flex-col justify-between text-xs transition-all shadow-sm ${severityColors[diff.severity]}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={diff.path}>
                                {diff.path}
                              </span>
                              <span className="text-[8px] font-mono uppercase tracking-widest font-black shrink-0">
                                {severityBadges[diff.severity]}
                              </span>
                            </div>
                            <p className="text-[10px] leading-snug font-sans opacity-95 mt-2">
                              {diff.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Explainable Logic - Interactive Architect Panel */}
              {genSettings.showExplainableLogic && !['json', 'ui', 'mock', 'doc', 'graph'].includes(outputTab) && decisions.length > 0 && (
                <div className="bg-slate-50/85 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-900/90 p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      onClick={() => setShowDecisions(!showDecisions)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-yellow-500/10 text-yellow-500 animate-pulse">
                        <Lightbulb size={12} />
                      </span>
                      <span className="font-mono uppercase tracking-wider text-[10px] text-slate-700 dark:text-slate-300">Explainable Logic ({decisions.length} Decisions)</span>
                    </button>
                    <button 
                      onClick={() => setShowDecisions(!showDecisions)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
                    >
                      {showDecisions ? "Hide" : "Show"}
                    </button>
                  </div>
                  
                  {showDecisions && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 max-h-48 overflow-y-auto no-scrollbar pb-1">
                      {decisions.map(decision => {
                        const isDisabled = decision.meta.disabled;
                        
                        return (
                          <div 
                            key={decision.id} 
                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-950/20 border-slate-200/55 dark:border-slate-850 opacity-60' : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-blue-500/30 dark:hover:border-blue-500/40 shadow-sm'}`}
                            onMouseEnter={() => !isDisabled && highlightDecisionInCode(decision)}
                            onMouseLeave={clearDecisionHighlight}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                  {decision.title}
                                </span>
                                <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${isDisabled ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'}`}>
                                  {decision.type === 'unification' ? 'Unification' : decision.type === 'timestamp' ? 'Inheritance' : 'Flattening'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mb-2.5 font-sans">
                                {decision.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              {decision.type === 'unification' && (
                                <>
                                  {!isDisabled ? (
                                    <>
                                      {renamingId === decision.id ? (
                                        <div className="flex items-center gap-1.5 w-full">
                                          <input 
                                            type="text" 
                                            value={renameValue} 
                                            onChange={e => setRenameValue(e.target.value)}
                                            placeholder="New name..."
                                            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-[10px] font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all"
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                const originalName = decision.meta.originalName!;
                                                if (renameValue.trim()) {
                                                  setGenSettings(s => ({
                                                    ...s,
                                                    customTypeNames: {
                                                      ...s.customTypeNames,
                                                      [originalName]: renameValue.trim()
                                                    }
                                                  }));
                                                }
                                                setRenamingId(null);
                                              } else if (e.key === 'Escape') {
                                                setRenamingId(null);
                                              }
                                            }}
                                            autoFocus
                                          />
                                          <button 
                                            onClick={() => {
                                              const originalName = decision.meta.originalName!;
                                              if (renameValue.trim()) {
                                                setGenSettings(s => ({
                                                  ...s,
                                                  customTypeNames: {
                                                    ...s.customTypeNames,
                                                    [originalName]: renameValue.trim()
                                                  }
                                                }));
                                              }
                                              setRenamingId(null);
                                            }}
                                            className="p-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
                                          >
                                            <Check size={10} />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button 
                                            onClick={() => {
                                              setGenSettings(s => ({
                                                ...s,
                                                disabledUnifications: [...(s.disabledUnifications || []), decision.meta.originalName!]
                                              }));
                                            }}
                                            className="text-[9px] font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 px-2 py-1 rounded border border-red-200 dark:border-red-800 transition-colors"
                                          >
                                            Split
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setRenamingId(decision.id);
                                              setRenameValue(decision.meta.semanticName || "");
                                            }}
                                            className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 hover:text-white hover:bg-blue-600 dark:hover:bg-blue-600 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                                          >
                                            Rename
                                          </button>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setGenSettings(s => ({
                                          ...s,
                                          disabledUnifications: (s.disabledUnifications || []).filter(name => name !== decision.meta.originalName!)
                                        }));
                                      }}
                                      className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-350 bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-200 dark:hover:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-850 transition-colors"
                                    >
                                      Re-unify
                                    </button>
                                  )}
                                </>
                              )}
                              
                              {decision.type === 'timestamp' && (
                                <button 
                                  onClick={() => {
                                    setGenSettings(s => ({
                                      ...s,
                                      extractTimestamps: !s.extractTimestamps
                                    }));
                                  }}
                                  className={`text-[9px] font-mono font-bold px-2 py-1 rounded border transition-colors ${isDisabled ? 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-red-600 dark:text-red-400 border-red-250 dark:border-red-900/60 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white'}`}
                                >
                                  {isDisabled ? "Re-enable" : "Split Model"}
                                </button>
                              )}

                              {decision.type === 'flattening' && (
                                <button 
                                  onClick={() => {
                                    setGenSettings(s => ({
                                      ...s,
                                      flattenWrappers: !s.flattenWrappers
                                    }));
                                  }}
                                  className={`text-[9px] font-mono font-bold px-2 py-1 rounded border transition-colors ${isDisabled ? 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-red-600 dark:text-red-400 border-red-250 dark:border-red-900/60 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white'}`}
                                >
                                  {isDisabled ? "Re-enable" : "Disable"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  theme={isDark ? "vs-dark" : "light"}
                  language={outputTab === 'doc' ? 'markdown' : outputTab}
                  value={outputs[outputTab] || "// Generate code..."}
                  onMount={(editor, monaco) => {
                    outputEditorRef.current = editor;
                    monacoRef.current = monaco;
                  }}
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
          isPro={isPro || isProLicensed}
          setShowLicenseModal={setShowLicenseModal}
          onClose={() => setShowBatchModal(false)}
        />
      )}

      {/* Ultra-Smooth Event Shield during drag to prevent Monaco events hijacking */}
      {isResizing && (
        <div className="absolute inset-0 z-[100] cursor-col-resize pointer-events-auto bg-transparent select-none" />
      )}

      {/* Mobile Language Selector Bottom Sheet */}
      {showMobileLangs && (
        <div className="md:hidden fixed inset-0 z-[200] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setShowMobileLangs(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-all duration-300" 
          />
          {/* Sheet */}
          <div className="relative bg-white dark:bg-slate-950 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-6 max-h-[80vh] overflow-y-auto z-10 shadow-2xl flex flex-col no-scrollbar transition-all duration-300">
            {/* Header / Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-4 shrink-0" />
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-[10px] font-mono uppercase text-slate-450 dark:text-slate-500 tracking-wider">
                Select Output Language
              </h3>
              <button 
                onClick={() => setShowMobileLangs(false)}
                className="text-[10px] font-mono uppercase text-blue-600 dark:text-blue-400 font-bold hover:text-slate-950 dark:hover:text-white"
              >
                Close
              </button>
            </div>
            
            {/* Lang Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setOutputTab(tab.id);
                    setShowMobileLangs(false);
                  }}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all active:scale-95 ${outputTab === tab.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-500/35 hover:text-blue-600'}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0a0f1c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden flex flex-col items-center text-center"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/50">
              <Crown size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2 font-sans tracking-tight">
              Unlock TypeFlow Pro
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6 font-sans">
              You&apos;ve reached your free daily limit for AI features. Upgrade to <b>TypeFlow Pro</b> to unlock unlimited, 100% private conversions.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button 
                onClick={() => {
                  trackProClick('workbench_paywall_pricing');
                  window.open('https://typeflow.dev/pricing', '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-sm shadow-xl shadow-slate-900/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Subscribe to Pro 
                <span className="text-xs opacity-70 bg-white/20 dark:bg-black/10 px-2 py-0.5 rounded-full">$4.99/mo</span>
              </button>
              <button 
                onClick={() => {
                  setShowPaywall(false);
                  setShowGenSettings(true);
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                I already have a License Key
              </button>
            </div>
            <button 
              onClick={() => setShowPaywall(false)}
              className="mt-6 text-[10px] font-mono uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
