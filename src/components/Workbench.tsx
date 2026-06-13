'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import LZString from 'lz-string';
import {
  Terminal, Share2, Copy, FileJson, Settings, Loader2, Monitor, Trash2, Code2, Zap, Crown, Upload, ChevronDown,
  Lightbulb, Edit3, Check, PanelLeftClose, PanelLeftOpen, MoreHorizontal, Link, Download, Archive,
  Bookmark, BookmarkCheck, Library
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  runEngine,
  inferSchema,
  parseYAML,
  parseXML,
  parseCurl,
  curlToTypeScript,
  parseSQLToZod,
  parseOpenAPI,
  parseTypeScriptToSchema,
  getDecisions,
  type Decision
} from '@/lib/engine';
import QualityScorePanel from '@/components/QualityScorePanel';
import { compareSchemas, type SchemaDiff } from '@/lib/diff';
import {
  trackWorkbenchOpen,
  trackConvertSuccess,
  trackProClick,
  shouldReportConvert,
  trackInferenceError,
} from '@/lib/analytics';
import { JsonVisualizer, Toast } from './SharedUI';
import { History as HistoryIcon, Clock, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getWorkbenchEditorText, WorkbenchOutputStatus } from './workbench-utils';
import { resolveSlugTarget, monacoLanguageForTarget } from '@/lib/targets';
import { User } from '@supabase/supabase-js';
import SuperBatchModal from './SuperBatchModal';
import { loadLibrary, saveToLibrary, deleteFromLibrary, renameInLibrary, autoName, type LibraryEntry } from '@/lib/schemaLibrary';
import dynamic from 'next/dynamic';
import { SmartDiffView } from '@/components/SmartDiffView';
import { FullStackArchitectView } from '@/components/FullStackArchitectView';
import { sqlToMermaidERGen } from '@/lib/generators-extended';
const TypeGraphPanel = dynamic(() => import('./TypeGraphPanel'), { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">Loading graph…</div> });

interface WorkbenchProps {
  slug: string;
  isDark: boolean;
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
      "project_name": "TypeMorph",
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
      name: "typemorph",
      full_name: "devflow-labs/typemorph",
      private: false,
      owner: {
        login: "devflow-labs",
        id: 9384758,
        avatar_url: "https://avatars.githubusercontent.com/u/9384758?v=4",
        type: "Organization",
        site_admin: false
      },
      html_url: "https://github.com/devflow-labs/typemorph",
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

function safeStringify(obj: unknown, indent?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  }, indent);
}

export function Workbench({ slug, isDark, outputTab, setOutputTab, isPro, setShowLicenseModal, trialCount = 3, setTrialCount, user, onCursorChange, onEmptyChange, onEditorError }: WorkbenchProps) {
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

  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [outputs, setOutputs] = useState<any>({});
  const [outputState, setOutputState] = useState<Record<string, WorkbenchOutputStatus>>({});
  const [jsonData, setJsonData] = useState<any>(null);
  const inferredSchema = useMemo(() => {
    if (!jsonData) return null;
    try { return inferSchema(jsonData); } catch { return null; }
  }, [jsonData]);
  const [history, setHistory] = useState<any[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [libraryRenamingId, setLibraryRenamingId] = useState<string | null>(null);
  const [libraryRenameValue, setLibraryRenameValue] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const setOutputStateFor = useCallback((lang: string, status: 'idle' | 'loading' | 'error' | 'unsupported', message?: string) => {
    setOutputState(prev => ({
      ...prev,
      [lang]: { status, message }
    }));
  }, []);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [urlFetchInput, setUrlFetchInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState('');
  const [corsBlockedUrl, setCorsBlockedUrl] = useState('');
  const [showGraphBadge, setShowGraphBadge] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('typemorph_graph_tab_visited')) setShowGraphBadge(true);
  }, []);
  const [hasParseError, setHasParseError] = useState(false);
  const [diffSeedContent, setDiffSeedContent] = useState('');
  const [diffSeedKey, setDiffSeedKey] = useState(0);
  const [showMobileLangs, setShowMobileLangs] = useState(false);
  const [saveCloudHistory, setSaveCloudHistory] = useState<boolean>(true);
  const [lastWipedContent, setLastWipedContent] = useState<string>("");
  const [isSharing, setIsSharing] = useState(false);
  const [localFileHandle, setLocalFileHandle] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const IS_BETA = true; // ベ�Eタ期間中はtrueに設宁E
  const [isProLicensed, setIsProLicensed] = useState(IS_BETA);

  const EXT_MAP: Record<string, string> = {
    typescript: 'ts', zod: 'zod.ts', go: 'go', python: 'py', rust: 'rs',
    dart: 'dart', php: 'php', java: 'java', kotlin: 'kt', swift: 'swift',
    csharp: 'cs', protobuf: 'proto', graphql: 'graphql', sql: 'sql',
    jsonschema: 'schema.json', mock: 'json', json: 'json', er: 'mmd', doc: 'md',
  };
  const VISUAL_TABS = new Set(['graph', 'history', 'diff', 'architect', 'ui', 'saved']);

  const handleDownload = () => {
    const content = outputs[outputTab];
    if (!content || VISUAL_TABS.has(outputTab)) return;
    const ext = EXT_MAP[outputTab] ?? 'txt';
    const filename = `${slug || 'typemorph-output'}.${ext}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ZIP_ENTRIES: { key: string; ext: string; filename: string }[] = [
    { key: 'typescript',  ext: 'ts',          filename: 'output.ts' },
    { key: 'zod',         ext: 'zod.ts',       filename: 'output.zod.ts' },
    { key: 'go',          ext: 'go',           filename: 'output.go' },
    { key: 'python',      ext: 'py',           filename: 'output.py' },
    { key: 'rust',        ext: 'rs',           filename: 'output.rs' },
    { key: 'java',        ext: 'java',         filename: 'output.java' },
    { key: 'kotlin',      ext: 'kt',           filename: 'output.kt' },
    { key: 'swift',       ext: 'swift',        filename: 'output.swift' },
    { key: 'csharp',      ext: 'cs',           filename: 'output.cs' },
    { key: 'protobuf',    ext: 'proto',        filename: 'output.proto' },
    { key: 'graphql',     ext: 'graphql',      filename: 'output.graphql' },
    { key: 'sql',         ext: 'prisma',       filename: 'output.prisma' },
    { key: 'jsonschema',  ext: 'schema.json',  filename: 'output.schema.json' },
    { key: 'mock',        ext: 'json',         filename: 'mock-data.json' },
  ];

  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    if (isZipping) return;
    setIsZipping(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let count = 0;
      for (const { key, filename } of ZIP_ENTRIES) {
        const content = outputs[key];
        if (content?.trim() && !content.includes('Unsupported output target')) {
          zip.file(filename, content);
          count++;
        }
      }
      if (count === 0) return;
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'typemorph-output'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMsg(`ZIP downloaded (${count} files)`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setIsZipping(false);
    }
  };

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
        setLocalFileHandle(null); // エラー時�E解除
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
      const saved = localStorage.getItem('typemorph_save_cloud_history');
      if (saved !== null) {
        setTimeout(() => setSaveCloudHistory(saved === 'true'), 0);
      }
      
      // ベ�Eタ版でなぁE��合�Eみローカル証明書をチェチE��
      if (!IS_BETA) {
        const cert = localStorage.getItem('typemorph_pro_cert');
        if (cert) {
          setTimeout(() => setIsProLicensed(true), 0);
        }
      }

      // ... (trial reset logic remains same for counting, but won't block Pro in beta)
    }
  }, [IS_BETA]);
  const handleSaveCloudHistoryChange = (val: boolean) => {
    setSaveCloudHistory(val);
    localStorage.setItem('typemorph_save_cloud_history', String(val));
  };


  const [showGenSettings, setShowGenSettings] = useState(false);
  const [genSettings, setGenSettings] = useState({
    exportDefault: false,
    optionalFields: false,
    useUUID: true,
    sharedPrefix: 'Shared',
    disabledUnifications: [] as string[],
    customTypeNames: {} as Record<string, string>,
    customFieldNames: {} as Record<string, string>, // "ClassName.fieldName" → "newName"
    extractTimestamps: true,
    flattenWrappers: true,
    showExplainableLogic: true,
  });

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showDecisions, setShowDecisions] = useState(false);
  const [showDecisionsBanner, setShowDecisionsBanner] = useState(false);
  const decisionsBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previousJsonData, setPreviousJsonData] = useState<any>(null);
  const [schemaDiffs, setSchemaDiffs] = useState<SchemaDiff[]>([]);
  const baselineJsonRef = useRef<any>(null);

  interface SchemaHistoryEntry {
    timestamp: Date;
    diffs: SchemaDiff[];
    inputSnapshot: string;
  }
  const [schemaHistory, setSchemaHistory] = useState<SchemaHistoryEntry[]>([]);

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
        localStorage.setItem('typemorph_pro_cert', data.token);
        localStorage.setItem('typemorph_license_key', targetKey);
        setIsProLicensed(true);
        setLicenseKeyInput("");
        if (!providedKey) {
          setToastMsg("Pro Subscription Activated! ");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      } else {
        if (!providedKey) {
          setLicenseError(data.error || "Invalid license key.");
        } else {
          // サイレント更新に失敗した場合、ライセンスを無効匁E
          localStorage.removeItem('typemorph_pro_cert');
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

  // JWTの有効期限チェチE��ユーチE��リチE��
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
      const cert = localStorage.getItem('typemorph_pro_cert');
      const savedKey = localStorage.getItem('typemorph_license_key');
      
      if (cert) {
        if (isTokenExpired(cert)) {
          if (savedKey) {
            // ト�Eクンが�EれてぁE��がキーがある場合、バチE��グラウンドで再認証
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
  const checkAndConsumeTrial = useCallback((): boolean => {
    if (isProLicensed) return true; // Pro版�E無制陁E
    if (localTrialCount > 0) {
      const newCount = localTrialCount - 1;
      setLocalTrialCount(newCount);
      localStorage.setItem('typemorph_trial_count', String(newCount));
      
      // トライアル消費のト�Eスト通知
      setToastMsg(`Free Trial Used (${newCount} left today)`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      return true;
    }
    // トライアル刁E��の場合�Eペイウォールを表示して実行ブロチE��
    setShowPaywall(true);
    return false;
  }, [isProLicensed, localTrialCount, setLocalTrialCount, setShowPaywall, setToastMsg, setShowToast]);

  const checkAndConsumeBasicTrial = useCallback((): boolean => {
    if (isProLicensed) return true;
    if (basicTrialCount > 0) {
      const newCount = basicTrialCount - 1;
      setBasicTrialCount(newCount);
      localStorage.setItem('typemorph_basic_trial_count', String(newCount));
      return true;
    }
    setShowPaywall(true);
    return false;
  }, [isProLicensed, basicTrialCount, setBasicTrialCount, setShowPaywall, setToastMsg, setShowToast]);


  // Hydrate data from URL hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#data=')) {
        try {
          const compressed = hash.substring(6);
          const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
          if (decompressed) {
            try {
              const { input: savedInput, tab } = JSON.parse(decompressed);
              setTimeout(() => {
                setInput(savedInput);
                if (tab) setOutputTab(tab);
              }, 0);
            } catch {
              setTimeout(() => setInput(decompressed), 0);
            }
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
          try {
            const { input: savedInput, tab } = JSON.parse(decompressed);
            setInput(savedInput);
            if (tab) setOutputTab(tab);
          } catch {
            setInput(decompressed);
          }
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
    const saved = localStorage.getItem('typemorph_gen_settings');
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
    localStorage.setItem('typemorph_gen_settings', JSON.stringify(genSettings));
  }, [genSettings]);

  useEffect(() => {
    if (jsonData) {
      const list = getDecisions(jsonData, genSettings);
      setTimeout(() => setDecisions(list), 0);
      // Auto-show banner when engine makes decisions
      if (list.length > 0) {
        setShowDecisionsBanner(true);
        if (decisionsBannerTimerRef.current) clearTimeout(decisionsBannerTimerRef.current);
        decisionsBannerTimerRef.current = setTimeout(() => setShowDecisionsBanner(false), 5000);
      } else {
        setShowDecisionsBanner(false);
      }
    } else {
      setTimeout(() => setDecisions([]), 0);
      setShowDecisionsBanner(false);
    }
  }, [jsonData, genSettings]);

  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);

  const outputTabRef = useRef(outputTab);
  useEffect(() => { outputTabRef.current = outputTab; }, [outputTab]);

  const taskIdRef = useRef(0);
  const isGeneratingRef = useRef(false);

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

  const applyFetchedText = useCallback((text: string) => {
    if (!text.trim()) throw new Error('Empty response from URL');
    setInput(text.trim());
    setUrlFetchInput('');
    setShowUrlBar(false);
    setUrlFetchError('');
    setCorsBlockedUrl('');
    setToastMsg('Loaded from URL');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }, [setInput]);

  const handleFetchFromURL = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setUrlFetchError('URL must start with http:// or https://');
      return;
    }
    setIsFetchingUrl(true);
    setUrlFetchError('');
    setCorsBlockedUrl('');
    try {
      const res = await fetch(trimmed, {
        headers: { Accept: 'application/json, text/plain, application/yaml, */*' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      applyFetchedText(await res.text());
    } catch (err: any) {
      // CORS or network error — offer opt-in proxy instead of silently routing through server
      const isCors = err instanceof TypeError || err?.message?.toLowerCase().includes('cors') || err?.message?.toLowerCase().includes('failed to fetch') || err?.message?.toLowerCase().includes('network');
      if (isCors) {
        setCorsBlockedUrl(trimmed);
        setUrlFetchError('');
      } else {
        setUrlFetchError(err.message ?? 'Failed to fetch URL');
      }
    } finally {
      setIsFetchingUrl(false);
    }
  }, [applyFetchedText]);

  const handleFetchViaProxy = useCallback(async () => {
    if (!corsBlockedUrl) return;
    setIsFetchingUrl(true);
    setUrlFetchError('');
    try {
      const proxy = await fetch(`/api/fetch-url?url=${encodeURIComponent(corsBlockedUrl)}`);
      if (!proxy.ok) throw new Error(`Proxy: HTTP ${proxy.status} ${proxy.statusText}`);
      applyFetchedText(await proxy.text());
    } catch (err: any) {
      setUrlFetchError(err.message ?? 'Failed to fetch via proxy');
    } finally {
      setIsFetchingUrl(false);
    }
  }, [corsBlockedUrl, applyFetchedText]);


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



  const processInput = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setHasParseError(false);
      setOutputs({});
      setOutputState({});
      return;
    }

    // 基本変換の回数制限チェチE��
    if (!checkAndConsumeBasicTrial()) return;

    isGeneratingRef.current = true; // Start generating

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
    else if (trimmed.toUpperCase().replace(/\s+/g, ' ').trim().startsWith('CREATE TABLE') ||
             (trimmed.toUpperCase().includes('CREATE TABLE') && 
              !trimmed.trim().startsWith('{') && 
              !trimmed.trim().startsWith('['))) {
      try {
        res.zod = parseSQLToZod(trimmed);
        res.er = sqlToMermaidERGen.generate(trimmed);
        setJsonData(null);
        setSchemaDiffs([]);
        if (res.zod || res.er) {
          success = true;
          reportConvertIfNew(trimmed, 'zod');
        }
      } catch (e) {}
    }
    else {
      try {
        const tsRes = (trimmed.includes('interface ') || trimmed.includes('type ')) ? parseTypeScriptToSchema(trimmed) : null;
        if (tsRes) {
          jsonObj = tsRes;
          success = true;
        } else {
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          jsonObj = JSON.parse(trimmed);
          success = true;
        }
        else if (trimmed.startsWith('<')) {
          const xmlResult = parseXML(trimmed);
          if (xmlResult && Object.keys(xmlResult).length > 0) {
            jsonObj = xmlResult;
            success = true;
          }
        }
        else {
          const yamlResult = parseYAML(trimmed);
          if (yamlResult && Object.keys(yamlResult).length > 0) {
            jsonObj = yamlResult;
            success = true;
          }
          }
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
            if (diffs.length > 0) {
              setSchemaHistory(prev => [
                {
                  timestamp: new Date(),
                  diffs,
                  inputSnapshot: safeStringify(jsonObj).slice(0, 200)
                },
                ...prev.slice(0, 19) // 最大20件保持
              ]);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          baselineJsonRef.current = jsonObj;
          setSchemaDiffs([]);
        }
        const activeLang = outputTabRef.current || 'typescript';
        const taskId = ++taskIdRef.current;
        // slug 専用ターゲット（mongoose/drizzle/csv 等）も先読み生成対象に含める
        const slugTargetKey = resolveSlugTarget(slug)?.key;
        const baseLangs = ['typescript', 'zod', 'go', 'rust', 'java', 'python', 'dart', 'php', 'csharp', 'protobuf', 'graphql', 'swift', 'kotlin', 'sql', 'jsonschema', 'mock', 'ui', 'doc'];
        if (slugTargetKey && !baseLangs.includes(slugTargetKey)) baseLangs.push(slugTargetKey);
        const langs = baseLangs.filter(l => l !== activeLang);
        const allTargets = [activeLang, ...langs];

        setOutputs((prev: any) => ({
          ...prev,
          ...Object.fromEntries(allTargets.map(lang => [lang, '']))
        }));
        allTargets.forEach(lang => setOutputStateFor(lang, 'loading'));

        // 1. Immediately calculate the active tab to make it feel instant!
        try {
          res[activeLang] = runEngine(jsonObj, activeLang, slug, genSettings);
          res.json = safeStringify(jsonObj, 2);

          const isUnsupported = typeof res[activeLang] === 'string' && res[activeLang].startsWith('// Unsupported output target');
          setOutputStateFor(activeLang, isUnsupported ? 'unsupported' : 'idle', isUnsupported ? res[activeLang] : undefined);

          // Update the active tab output immediately!
          setOutputs((prev: any) => ({ 
            ...prev, 
            [activeLang]: res[activeLang], 
            json: res.json 
          }));
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown inference error';
          trackInferenceError('run_engine_failure', {
            lang: activeLang,
            stage: 'initial',
            message: error instanceof Error ? error.name : 'unknown',
          });
          console.error('Inference error:', error);
          setHasParseError(true);
          setOutputStateFor(activeLang, 'error', `// Failed to generate ${activeLang}: ${message}`);
          setOutputs((prev: any) => ({ ...prev, [activeLang]: `// Failed to generate ${activeLang}: ${message}` }));
          isGeneratingRef.current = false;
          return;
        }

        // 2. Queue the remaining languages in the background asynchronously
        
        const generateBackground = async () => {
          try {
            for (const lang of langs) {
              await new Promise(r => setTimeout(r, 0)); // Yield to main thread to prevent UI freeze
              if (taskId !== taskIdRef.current) return; // Cancel if obsolete
              try {
                const compiled = runEngine(jsonObj, lang, slug, genSettings);
                if (taskId !== taskIdRef.current) return; // Cancel if obsolete

                const isUnsupported = typeof compiled === 'string' && compiled.startsWith('// Unsupported output target');
                setOutputStateFor(lang, isUnsupported ? 'unsupported' : 'idle', isUnsupported ? compiled : undefined);
                setOutputs((prev: any) => ({ ...prev, [lang]: compiled }));
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown inference error';
                trackInferenceError('run_engine_failure', {
                  lang,
                  stage: 'background',
                  message: error instanceof Error ? error.name : 'unknown',
                });
                console.error('Background inference error:', error);
                setOutputStateFor(lang, 'error', `// Failed to generate ${lang}: ${message}`);
                setOutputs((prev: any) => ({ ...prev, [lang]: `// Failed to generate ${lang}: ${message}` }));
                return;
              }
            }
          } finally {
            if (taskId === taskIdRef.current) {
              isGeneratingRef.current = false; // Finish generating
            }
          }
        };
        generateBackground();
        reportConvertIfNew(trimmed, activeLang);
        return;
      }
    }
    setOutputs(res);
    setOutputState({});
    setHasParseError(!success);
    isGeneratingRef.current = false; // Finish generating (sync case)
  }, [input, slug, genSettings, reportConvertIfNew, outputTab]);

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
  }, [processInput, input]);

  useEffect(() => {
    const saved = localStorage.getItem('typemorph_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => setHistory(parsed), 0);
      } catch (e) {
        console.warn('typemorph_history corrupted, clearing.', e);
        localStorage.removeItem('typemorph_history');
      }
    }
    setTimeout(() => setLibrary(loadLibrary()), 0);
  }, []);

  const saveToHistory = useCallback(async (content: string) => {
    if (!content || content.length < 10) return;
    
    // Save to local storage (for guests)
    setHistory(prev => {
      const filtered = prev.filter(h => h.content !== content);
      const stored = content.length > 10_240 ? content.slice(0, 10_240) : content;
      const next = [{ content, timestamp: new Date().toISOString() }, ...filtered].slice(0, 5);
      try {
        const storable = next.map((h, i) => i === 0 ? { ...h, content: stored } : h);
        localStorage.setItem('typemorph_history', JSON.stringify(storable));
      } catch {
        // localStorage quota exceeded — keep in-memory history but skip persistence
      }
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

  const handleSaveToLibrary = useCallback(() => {
    if (!input || input.trim().length < 5) return;
    const name = autoName(input, slug);
    const entry = saveToLibrary({ name, content: input, slug });
    setLibrary(loadLibrary());
    setSavedJustNow(true);
    setTimeout(() => setSavedJustNow(false), 2000);
  }, [input, slug]);

  const handleDeleteFromLibrary = useCallback((id: string) => {
    deleteFromLibrary(id);
    setLibrary(loadLibrary());
  }, []);

  const handleLibraryRenameCommit = useCallback((id: string) => {
    if (libraryRenameValue.trim()) renameInLibrary(id, libraryRenameValue.trim());
    setLibraryRenamingId(null);
    setLibraryRenameValue('');
    setLibrary(loadLibrary());
  }, [libraryRenameValue]);

  // Hybrid Smart Share: URL hash for small payloads, Supabase for large ones.
  // Data NEVER leaves the browser unless the user explicitly clicks this button.
  const handleSmartShare = useCallback(async () => {
    if (!input) {
      alert("Please enter some input data first.");
      return;
    }
    setIsSharing(true);
    try {
      const payload = JSON.stringify({ input, tab: outputTab });
      const compressed = LZString.compressToEncodedURIComponent(payload);
      const candidateUrl = `${window.location.origin}${window.location.pathname}#data=${compressed}`;

      // URL-safe threshold: keep well below browser/sharing-tool limits
      const URL_LIMIT = 2000;

      if (candidateUrl.length <= URL_LIMIT) {
        // --- Mode 1: URL Hash (100% Private, no server involved) ---
        window.history.replaceState(null, '', `#data=${compressed}`);
        await navigator.clipboard.writeText(candidateUrl);
        setToastMsg("Private Link Copied! (URL Mode)");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        // --- Mode 2: Cloud Share (Supabase)  Eonly on explicit user action ---
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
        setToastMsg("☁E��ECloud Link Copied! (Schema stored securely)");
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
      if (input && input.length > 20 && input !== lastWipedContent && !isGeneratingRef.current) {
        saveToHistory(input);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [input, saveToHistory, lastWipedContent]);

  // Initial Sample Data & Magic Data Handling
  const lastSlug = useRef('');
  useEffect(() => {
    const magicData = localStorage.getItem('typemorph_magic_data');
    if (magicData) {
      setTimeout(() => {
        setInput(magicData);
        localStorage.removeItem('typemorph_magic_data');
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
        'sql-to-zod': `CREATE TABLE users (\\n  id VARCHAR(36) PRIMARY KEY,\\n  username VARCHAR(50) UNIQUE NOT NULL,\\n  email VARCHAR(255) NOT NULL,\\n  status VARCHAR(20) DEFAULT 'active',\\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\\n);`
      };
      setTimeout(() => {
        setInput(samples[slug] || `{\\n  "status": "ready",\\n  "tool": "${slug}"\\n}`);
      }, 0);
    }
    lastSlug.current = slug;
  }, [slug]);

  // このコンバータ slug が約束している出力形式（runEngine 対応のもの）
  const slugTarget = resolveSlugTarget(slug);

  const baseMainTabs = [
    { id: 'typescript', label: 'TS' },
    { id: 'zod', label: 'Zod' },
    { id: 'go', label: 'Go' },
    { id: 'python', label: 'Python' },
    { id: 'rust', label: 'Rust' },
    { id: 'diff', label: '↔ Diff' },
  ];

  const moreTabs = [
    { id: 'er', label: 'ER Diagram' },
    { id: 'architect', label: 'Architect' },
    { id: 'dart', label: 'Dart' },
    { id: 'php', label: 'PHP' },
    { id: 'java', label: 'Java' },
    { id: 'kotlin', label: 'Kotlin' },
    { id: 'swift', label: 'Swift' },
    { id: 'csharp', label: 'C#' },
    { id: 'protobuf', label: 'Proto' },
    { id: 'graphql', label: 'GQL' },
    { id: 'sql', label: 'SQL' },
    { id: 'jsonschema', label: 'Schema' },
    { id: 'mock', label: 'Mock Data' },
    { id: 'graph', label: 'Graph' },
    { id: 'doc', label: 'Doc' },
    { id: 'json', label: 'JSON' }
  ];

  // slug の目的形式が標準タブに無い場合（mongoose, drizzle, csv, toml 等）は
  // 専用タブを先頭に注入し、ページが約束どおりの出力を必ず出せるようにする。
  const mainTabs = (() => {
    const existing = new Set([...baseMainTabs, ...moreTabs].map(t => t.id));
    if (slugTarget && !existing.has(slugTarget.key)) {
      return [{ id: slugTarget.key, label: slugTarget.label }, ...baseMainTabs];
    }
    return baseMainTabs;
  })();

  const tabs = [...mainTabs, ...moreTabs];

  return (
    <div 
      ref={containerRef}
      style={{ 
        ['--left-width' as any]: isLeftCollapsed ? '0%' : `${leftWidth}%`,
        ['--right-width' as any]: isLeftCollapsed ? '100%' : `${100 - leftWidth}%`
      }}
      className={`flex flex-col md:flex-row h-[calc(100vh-80px)] px-6 pt-6 pb-6 bg-slate-50 dark:bg-[#0A0A0A] relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}
    >
      <div 
        className={`flex flex-col min-w-0 h-full transition-all duration-300 ease-in-out overflow-hidden ${isLeftCollapsed ? 'w-0 md:w-0 opacity-0 pointer-events-none' : 'w-full md:flex-none md:w-[calc(var(--left-width)-12px)] opacity-100'}`}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              Input
            </span>
            {hasParseError && (
              <span className="text-[10px] font-mono uppercase text-red-500 dark:text-red-400">
                Syntax Error
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Save to Library */}
            {input.trim() && (
              <button
                onClick={handleSaveToLibrary}
                className={`flex items-center gap-1.5 text-[10px] font-mono uppercase px-3 py-1.5 rounded-xl transition-all ${savedJustNow ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                title="Save to Library"
              >
                {savedJustNow ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                <span className="hidden sm:inline">{savedJustNow ? 'Saved!' : 'Save'}</span>
              </button>
            )}
            {/* ⋯ More Menu */}
            <div className="relative group/more">
              <button
                className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <MoreHorizontal size={12} />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all z-50 overflow-hidden">
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="flex items-center gap-2 w-full text-left text-[10px] font-mono uppercase text-slate-600 dark:text-slate-300 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <FolderOpen size={12} /> <span>Folder Bulk</span>
                </button>
                <button
                  onClick={() => { setShowUrlBar(v => !v); setUrlFetchError(''); }}
                  className="flex items-center gap-2 w-full text-left text-[10px] font-mono uppercase text-slate-600 dark:text-slate-300 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Link size={12} /> <span>Load from URL</span>
                </button>
              </div>
            </div>
            <button 
              onClick={() => { setInput(""); setHideEmptyState(true); resetBaseline(null); }}
              className="flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all"
              title="Clear Editor"
            >
              <Trash2 size={14}/>
            </button>
          </div>
        </div>

        {/* Presets and History Chips */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-350 tracking-wider shrink-0 font-bold">
              <Zap size={10} className="text-slate-400" /> Presets:
            </span>
            {PRESETS.map((p, i) => (
              <button 
                key={i}
                onClick={() => { setInput(typeof p.data === 'string' ? p.data : JSON.stringify(p.data, null, 2)); resetBaseline(p.data); }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-all shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>
          
          {(() => {
            const filteredHistory = history.filter(h => h.content.trim() !== input.trim());
            return filteredHistory.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-350 tracking-wider shrink-0 font-bold">
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
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all truncate max-w-[120px] shrink-0"
                    title={h.content.slice(0, 100)}
                  >
                    {h.content.trim().slice(0, 15)}...
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Inline URL bar — shown when user picks "Load from URL" from the ⋯ menu */}
        {showUrlBar && (
          <div className="mb-3 flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                autoFocus
                type="url"
                value={urlFetchInput}
                onChange={e => { setUrlFetchInput(e.target.value); setUrlFetchError(''); setCorsBlockedUrl(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleFetchFromURL(urlFetchInput); if (e.key === 'Escape') { setShowUrlBar(false); setUrlFetchError(''); setCorsBlockedUrl(''); } }}
                placeholder="https://api.example.com/openapi.json"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
              <button
                onClick={() => handleFetchFromURL(urlFetchInput)}
                disabled={isFetchingUrl || !urlFetchInput.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
              >
                {isFetchingUrl ? <Loader2 size={11} className="animate-spin" /> : <Link size={11} />}
                {isFetchingUrl ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
              Schema conversion runs entirely in your browser.
            </p>
            {urlFetchError && (
              <p className="text-[10px] text-red-500 px-1">{urlFetchError}</p>
            )}
            {corsBlockedUrl && (
              <div className="flex items-start gap-2 px-2 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mb-1">
                    Direct fetch was blocked by CORS policy.
                  </p>
                  <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80">
                    You can try via proxy, but <span className="font-semibold">the URL will pass through our server</span>. Do not use this for internal or sensitive URLs.
                  </p>
                </div>
                <button
                  onClick={handleFetchViaProxy}
                  disabled={isFetchingUrl}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono uppercase font-bold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition-all"
                >
                  {isFetchingUrl ? <Loader2 size={10} className="animate-spin" /> : null}
                  Try via proxy
                </button>
              </div>
            )}
          </div>
        )}

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
          className="flex-1 bg-white dark:bg-[#0F0F0F]/50 backdrop-blur-md rounded-xl shadow-xl dark:shadow-black/40 border border-slate-200 dark:border-[#222222]/50 overflow-hidden relative group/editor"
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
                className="w-full max-w-lg border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 bg-white/40 dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-white/30 hover:shadow-lg transition-all duration-300 group/drop cursor-pointer"
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
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 group-hover/drop:scale-110 transition-transform duration-300">
                  <Upload size={32} className="" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 font-sans">
                    Drag & Drop Schema File
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300 max-w-xs mx-auto font-sans">
                    Supports JSON, XML, YAML, SQL or cURL format. Click to browse local files.
                  </p>
                </div>
              </div>

              {/* URL Import in empty state */}
              <div className="mt-5 w-full max-w-lg">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 tracking-wider block mb-2 font-bold">
                  Or Load from URL:
                </span>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlFetchInput}
                      onChange={e => { setUrlFetchInput(e.target.value); setUrlFetchError(''); setCorsBlockedUrl(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleFetchFromURL(urlFetchInput)}
                      placeholder="https://api.example.com/openapi.json"
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                    <button
                      onClick={() => handleFetchFromURL(urlFetchInput)}
                      disabled={isFetchingUrl || !urlFetchInput.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono uppercase font-bold rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all"
                    >
                      {isFetchingUrl ? <Loader2 size={11} className="animate-spin" /> : <Link size={11} />}
                      {isFetchingUrl ? 'Fetching…' : 'Fetch'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                    Schema conversion runs entirely in your browser.
                  </p>
                  {urlFetchError && (
                    <p className="text-[10px] text-red-500 px-1">{urlFetchError}</p>
                  )}
                  {corsBlockedUrl && (
                    <div className="flex items-start gap-2 px-2 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mb-1">
                          Direct fetch was blocked by CORS policy.
                        </p>
                        <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80">
                          You can try via proxy, but <span className="font-semibold">the URL will pass through our server</span>. Do not use this for internal or sensitive URLs.
                        </p>
                      </div>
                      <button
                        onClick={handleFetchViaProxy}
                        disabled={isFetchingUrl}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono uppercase font-bold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition-all"
                      >
                        {isFetchingUrl ? <Loader2 size={10} className="animate-spin" /> : null}
                        Try via proxy
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Cards */}
              <div className="mt-6 w-full max-w-xl">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 tracking-wider block mb-4 font-bold">
                  Or Quick Start with Architectural Samples:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(typeof p.data === 'string' ? p.data : JSON.stringify(p.data, null, 2))}
                      className="flex flex-col items-start p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-[#222222]/50 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
                    >
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-1">
                        <Zap size={10} className="text-yellow-500" /> Preset {i + 1}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors font-sans">
                        {p.label}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block leading-tight font-sans">
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
          className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all group/toggle"
          title={isLeftCollapsed ? 'Show input panel' : 'Hide input panel'}
        >
          {isLeftCollapsed ? (
            <PanelLeftOpen size={14} className="text-slate-400 dark:text-slate-500 group-hover/toggle:text-slate-900 dark:group-hover/toggle:text-white transition-colors" />
          ) : (
            <PanelLeftClose size={14} className="text-slate-400 dark:text-slate-500 group-hover/toggle:text-slate-900 dark:group-hover/toggle:text-white transition-colors" />
          )}
        </button>

        {/* Drag handle line (hidden when collapsed) */}
        {!isLeftCollapsed && (
          <div 
            onMouseDown={startResize}
            className="w-6 h-full cursor-col-resize flex items-center justify-center group"
            title="Drag to resize panes"
          >
            <div className={`w-[2px] h-full transition-all duration-150 ${isResizing ? 'bg-slate-900 dark:bg-white scale-x-125' : 'bg-slate-200 dark:bg-slate-800/80 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'}`} />
          </div>
        )}
      </div>

      <div className={`flex flex-col min-w-0 h-full transition-all duration-300 ease-in-out ${isLeftCollapsed ? 'w-full md:flex-1' : 'w-full md:flex-none md:w-[calc(var(--right-width)-12px)]'}`}>
        {/* ── Decisions Engine Banner ── */}
        <AnimatePresence>
          {showDecisionsBanner && decisions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-sm cursor-pointer group/banner"
              onClick={() => {
                setShowDecisions(true);
                setShowDecisionsBanner(false);
                if (decisionsBannerTimerRef.current) clearTimeout(decisionsBannerTimerRef.current);
              }}
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center shrink-0">
                <Zap size={12} className="text-indigo-600 dark:text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 leading-none mb-0.5">
                  ⚡ Engine made {decisions.length} structural decision{decisions.length > 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate">
                  {decisions.slice(0, 2).map(d => d.meta.semanticName ?? d.title).join(' · ')}{decisions.length > 2 ? ` · +${decisions.length - 2} more` : ''}
                </p>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400 dark:text-indigo-500 shrink-0 group-hover/banner:text-indigo-600 dark:group-hover/banner:text-indigo-300 transition-colors">
                View →
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDecisionsBanner(false); if (decisionsBannerTimerRef.current) clearTimeout(decisionsBannerTimerRef.current); }}
                className="ml-1 text-indigo-300 dark:text-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-xs leading-none shrink-0 font-black"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex justify-between items-center mb-3">
          {/* Desktop tabs navigation */}
          <div className="hidden md:flex items-center gap-1 overflow-visible no-scrollbar pb-1 max-w-[calc(100%-100px)]">
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setOutputTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 ${outputTab === tab.id ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
            {/* + More ▼ dropdown */}
            <div className="relative group/more-tabs">
              <button
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 ${moreTabs.some(t => t.id === outputTab) ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
              >
                <span>+ {moreTabs.some(t => t.id === outputTab) ? `More (${moreTabs.find(t => t.id === outputTab)?.label})` : 'More'}</span>
                <ChevronDown size={10} />
              </button>
              <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl opacity-0 invisible group-hover/more-tabs:opacity-100 group-hover/more-tabs:visible transition-all z-[9999] overflow-visible">
                {moreTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setOutputTab(tab.id);
                      if (tab.id === 'graph' && showGraphBadge) {
                        localStorage.setItem('typemorph_graph_tab_visited', '1');
                        setShowGraphBadge(false);
                      }
                    }}
                    className={`flex items-center gap-2 w-full text-left text-[10px] font-mono uppercase px-4 py-2.5 transition-colors ${outputTab === tab.id ? 'bg-slate-100 dark:bg-slate-700 text-slate-950 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <span>{tab.label}</span>
                    {tab.id === 'graph' && showGraphBadge && (
                      <span className="ml-auto text-[8px] font-black uppercase tracking-wider bg-indigo-500 text-white px-1.5 py-0.5 rounded-full leading-none">NEW</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile bottom sheet trigger button */}
          <button 
            onClick={() => setShowMobileLangs(true)}
            className="md:hidden flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all shrink-0 active:scale-95"
          >
            <span>{tabs.find(t => t.id === outputTab)?.label || outputTab.toUpperCase()}</span>
            <ChevronDown size={12} />
          </button>
          <div className="flex items-center gap-2">
            {/* 機能ボタン群 */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setOutputTab('saved')}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all ${outputTab === 'saved' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                title="Schema Library"
              >
                <Library size={14} />
                {library.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                    {library.length > 9 ? '9+' : library.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setOutputTab('history')}
                className="flex items-center justify-center text-slate-500 dark:text-slate-300 w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                title="Schema Change History"
              >
                <Clock size={14} />
              </button>
            </div>

            <button 
              onClick={handleSmartShare}
              disabled={isSharing}
              className="flex items-center justify-center text-slate-500 dark:text-slate-300 w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50"
              title="Copy shareable link (auto-selects URL or Cloud based on size)"
            >
              {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            </button>
            <button 
              onClick={() => {
                setShowGenSettings(!showGenSettings);
              }}
              className="flex items-center justify-center text-slate-500 dark:text-slate-300 w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
              title="Settings"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={handleDownload}
              disabled={!outputs[outputTab] || VISUAL_TABS.has(outputTab)}
              className="flex items-center justify-center text-slate-500 dark:text-slate-300 w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Download current tab as file"
            >
              <Download size={14} />
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping || !Object.values(outputs).some(v => typeof v === 'string' && v.trim())}
              className="flex items-center justify-center text-slate-500 dark:text-slate-300 w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Download all formats as ZIP"
            >
              {isZipping ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
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
              className="text-xs font-bold text-slate-950 dark:text-white px-4 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
            >
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white dark:bg-[#0F0F0F]/50 backdrop-blur-md rounded-xl shadow-xl dark:shadow-black/40 border border-slate-200 dark:border-[#222222]/50 overflow-hidden relative group">
          
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
                  <label className="flex items-center gap-2 text-xs font-bold dark:text-[#E8E8E8] cursor-pointer">
                    <input type="checkbox" checked={genSettings.exportDefault} onChange={e => setGenSettings(s => ({...s, exportDefault: e.target.checked}))} className="rounded text-slate-900 dark:text-white focus:ring-slate-900/20 dark:focus:ring-white/20" />
                    Use `export default` (TS)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold dark:text-[#E8E8E8] cursor-pointer">
                    <input type="checkbox" checked={genSettings.optionalFields} onChange={e => setGenSettings(s => ({...s, optionalFields: e.target.checked}))} className="rounded text-slate-900 dark:text-white focus:ring-slate-900/20 dark:focus:ring-white/20" />
                    Make all fields optional
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold dark:text-[#E8E8E8] cursor-pointer">
                    <input type="checkbox" checked={genSettings.useUUID} onChange={e => setGenSettings(s => ({...s, useUUID: e.target.checked}))} className="rounded text-slate-900 dark:text-white focus:ring-slate-900/20 dark:focus:ring-white/20" />
                    Infer UUIDs for `*id` (Zod)
                  </label>

                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Shared Type Prefix</span>
                    <input 
                      type="text" 
                      placeholder="e.g. Shared, Common, or empty" 
                      value={genSettings.sharedPrefix !== undefined ? genSettings.sharedPrefix : 'Shared'} 
                      onChange={e => setGenSettings(s => ({...s, sharedPrefix: e.target.value}))} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-[#E8E8E8] outline-none focus:border-slate-900 dark:focus:border-white dark:focus:ring-2 dark:focus:ring-white/20 transition-all font-sans"
                    />
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3">
                    <h5 className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-wider flex items-center gap-1.5">
                      <Crown size={12} className="text-yellow-500" /> TypeMorph License
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
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-[#E8E8E8] outline-none focus:border-slate-900 dark:focus:border-white dark:focus:ring-2 dark:focus:ring-white/20 transition-all font-mono"
                        />
                        {licenseError && <p className="text-[10px] text-red-500">{licenseError}</p>}
                        <button 
                          onClick={() => handleActivatePro()}
                          disabled={isVerifying}
                          className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-80 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isVerifying ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
                          <span>Activate Pro</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3">
                    <h5 className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-wider flex items-center gap-1.5">
                      {IS_BETA ? "Beta Access Status" : "Subscription Status"}
                    </h5>
                    {IS_BETA ? (
                      <div className="text-[10px] text-slate-700 dark:text-white font-bold px-2 py-1.5 bg-slate-100 dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10">
                        Full Access Unlocked for Beta
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isProLicensed ? "Your lifetime license is active." : "Free version with limited features."}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3">
                    <h5 className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-wider">Privacy & Data Control</h5>
                    <label className="flex items-center gap-2 text-xs font-bold dark:text-[#E8E8E8] cursor-pointer mb-3">
                      <input type="checkbox" checked={saveCloudHistory} onChange={e => handleSaveCloudHistoryChange(e.target.checked)} className="rounded text-slate-900 dark:text-white focus:ring-slate-900/20 dark:focus:ring-white/20" />
                      Save History to Cloud (Supabase)
                    </label>

                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to completely wipe all local conversion history? This cannot be undone.")) {
                          localStorage.removeItem('typemorph_history');
                          setHistory([]);
                          setLastWipedContent(input);
                          setToastMsg("Local History Wiped!");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }
                      }}
                      className="w-full mb-2 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 py-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-600 hover:text-white transition-all active:scale-95"
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
                      className="w-full flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase text-slate-600 dark:text-slate-350 bg-slate-100 dark:bg-slate-800/80 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-white/20 transition-all active:scale-95"
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
              <TypeGraphPanel
                tsCode={outputs['typescript'] || ""}
                isDark={isDark}
                onFieldRename={(nodeId, fieldName, newName) => {
                  const key = `${nodeId}.${fieldName}`;
                  setGenSettings(s => ({
                    ...s,
                    customFieldNames: {
                      ...s.customFieldNames,
                      [key]: newName
                    }
                  }));
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col relative">
              {outputTab === 'mock' && (
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-[#222222]/50 z-10 animate-fade-in">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-300 tracking-wider flex items-center gap-1.5 font-bold">
                    <Zap size={12} className="text-slate-500 dark:text-slate-400" /> Mock Data
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadMockJson}
                      className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all"
                    >
                      <span>Download JSON</span>
                    </button>
                    <button
                      onClick={downloadMockCsv}
                      className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all"
                    >
                      <span>Download CSV</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Schema Quality Score — only for typed-language outputs */}
              {inferredSchema && ['typescript', 'zod', 'go', 'rust', 'python', 'java', 'kotlin', 'swift', 'csharp', 'dart', 'php'].includes(outputTab) && (
                <div className="px-4 pt-3 pb-0">
                  <QualityScorePanel schema={inferredSchema} />
                </div>
              )}

              {/* Schema Migration Impact Analyzer */}
              {!['json', 'ui', 'mock', 'doc', 'graph'].includes(outputTab) && schemaDiffs.length > 0 && (
                <div className="bg-amber-50/40 dark:bg-amber-950/10 border-b border-amber-200 dark:border-amber-950/30 p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-amber-500/10 text-amber-500">
                        <Zap size={12} className="" />
                      </span>
                      <span className="font-mono uppercase tracking-wider text-[10px] text-slate-700 dark:text-slate-350 font-bold">
                        Schema Migration Impact ({schemaDiffs.length} Change{schemaDiffs.length > 1 ? 's' : ''} Detected)
                      </span>
                    </div>
                    <button 
                      onClick={acceptNewBaseline}
                      className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white px-2.5 py-1 rounded border border-amber-250 dark:border-amber-900/50 transition-all shadow-sm cursor-pointer"
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
                        info: 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      };

                      const severityBadges = {
                        error: 'Breaking',
                        warning: '⚠�E�EWarning',
                        info: 'Added'
                      };

                      return (
                        <div 
                          key={index} 
                          className={`p-3 rounded-xl border flex flex-col justify-between text-xs transition-all shadow-sm ${severityColors[diff.severity]}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={diff.path}>
                                {diff.path}
                              </span>
                              <span className="text-[10px] font-mono uppercase tracking-widest font-black shrink-0">
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
                <div className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-900/90 px-4 py-2 transition-all">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setShowDecisions(!showDecisions)}
                      className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      <span className="flex items-center justify-center w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                        <Lightbulb size={10} className="text-slate-400 dark:text-slate-500" />
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">Explainable logic ({decisions.length})</span>
                    </button>
                    <button 
                      onClick={() => setShowDecisions(!showDecisions)}
                      className="text-[10px] font-mono text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showDecisions ? "Hide" : "Show"}
                    </button>
                  </div>
                  
                  {showDecisions && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 max-h-36 overflow-y-auto no-scrollbar pb-1">
                      {decisions.map((decision, decisionIndex) => {
                        const isDisabled = decision.meta.disabled;
                        
                        return (
                          <div 
                            key={`${decision.id}-${decisionIndex}`} 
                            className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between group ${isDisabled ? 'bg-slate-100/30 dark:bg-slate-950/10 border-slate-200/40 dark:border-slate-850 opacity-50' : 'bg-white/80 dark:bg-[#0F0F0F]/30 border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'}`}
                            onMouseEnter={() => !isDisabled && highlightDecisionInCode(decision)}
                            onMouseLeave={clearDecisionHighlight}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`text-[10px] font-medium ${isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                  {decision.title}
                                </span>
                                <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded ${isDisabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                  {decision.type === 'unification' ? 'Unification' : decision.type === 'timestamp' ? 'Inheritance' : 'Flattening'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug mb-2 font-sans">
                                {decision.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-[10px] font-bold text-slate-800 dark:text-[#E8E8E8] outline-none focus:border-slate-900 dark:focus:border-white transition-all"
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
                                            className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 px-2 py-1 rounded border border-red-200 dark:border-red-800 transition-colors"
                                          >
                                            Split
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setRenamingId(decision.id);
                                              setRenameValue(decision.meta.semanticName || "");
                                            }}
                                            className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 hover:text-white dark:hover:text-slate-900 hover:bg-slate-900 dark:hover:bg-white px-2 py-1 rounded border border-slate-200 dark:border-white/10 transition-colors"
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
                                      className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-350 bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-200 dark:hover:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-850 transition-colors"
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
                                  className={`text-[10px] font-mono font-bold px-2 py-1 rounded border transition-colors ${isDisabled ? 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-red-600 dark:text-red-400 border-red-250 dark:border-red-900/60 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white'}`}
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
                                  className={`text-[10px] font-mono font-bold px-2 py-1 rounded border transition-colors ${isDisabled ? 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-red-600 dark:text-red-400 border-red-250 dark:border-red-900/60 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white'}`}
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
              {outputTab === 'er' ? (
                <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A]">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-[#1A1A1A] bg-slate-50 dark:bg-[#0F0F0F] shrink-0">
                    <span className="text-[10px] font-mono uppercase text-slate-400">ER Diagram (Mermaid)</span>
                    <a 
                      href="https://mermaid.live"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      Open in Mermaid Live ↗
                    </a>
                  </div>
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      language="markdown"
                      value={outputs['er'] || '%% Paste a SQL CREATE TABLE statement on the left'}
                      theme={isDark ? 'vs-dark' : 'light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        readOnly: true,
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </div>
              ) : outputTab === 'saved' ? (
                <div className="flex flex-col h-full bg-[#0A0A0A] overflow-y-auto">
                  <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Schema Library</h2>
                      <p className="text-xs text-slate-500">{library.length} saved · click to restore</p>
                    </div>
                    {library.length > 0 && (
                      <button onClick={() => { localStorage.removeItem('typemorph_library'); setLibrary([]); }} className="text-[10px] font-mono text-slate-500 hover:text-red-500 transition-colors">Clear all</button>
                    )}
                  </div>
                  {library.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
                      <Bookmark size={28} className="text-slate-700" />
                      <p className="text-xs text-slate-500">No saved schemas yet</p>
                      <p className="text-[10px] text-slate-600">Click <span className="font-bold text-slate-400">Save</span> in the input panel to save a schema</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-white/[0.05]">
                      {library.map(entry => (
                        <div key={entry.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                          <button
                            className="flex-1 text-left min-w-0"
                            onClick={() => { setInput(entry.content); setOutputTab('typescript'); }}
                          >
                            {libraryRenamingId === entry.id ? (
                              <input
                                autoFocus
                                value={libraryRenameValue}
                                onChange={e => setLibraryRenameValue(e.target.value)}
                                onBlur={() => handleLibraryRenameCommit(entry.id)}
                                onKeyDown={e => { if (e.key === 'Enter') handleLibraryRenameCommit(entry.id); if (e.key === 'Escape') { setLibraryRenamingId(null); } }}
                                className="w-full text-xs font-bold bg-white/10 text-white px-2 py-0.5 rounded outline-none border border-white/20"
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-xs font-bold text-white truncate">{entry.name}</p>
                            )}
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">{entry.slug} · {new Date(entry.savedAt).toLocaleDateString()}</p>
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => { setLibraryRenamingId(entry.id); setLibraryRenameValue(entry.name); }}
                              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                              title="Rename"
                            ><Edit3 size={11} /></button>
                            <button
                              onClick={() => handleDeleteFromLibrary(entry.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-all"
                              title="Delete"
                            ><Trash2 size={11} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : outputTab === 'history' ? (
                <div className="flex flex-col h-full p-4 gap-3 bg-white dark:bg-[#0A0A0A] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800 dark:text-[#E8E8E8]">Schema Change History</h2>
                      <p className="text-xs text-slate-400 dark:text-[#707070]">Changes detected since baseline</p>
                    </div>
                    {schemaHistory.length > 0 && (
                      <button
                        onClick={() => setSchemaHistory([])}
                        className="text-[10px] font-mono text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {schemaHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center">
                      <p className="text-xs text-slate-400 dark:text-[#707070]">No changes detected yet</p>
                      <p className="text-[10px] text-slate-300 dark:text-[#505050] mt-1">Edit your JSON to track schema changes</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {schemaHistory.map((entry, i) => (
                        <div key={i} className="border border-slate-200 dark:border-[#1A1A1A] rounded-lg p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 dark:text-[#707070]">
                              {entry.timestamp.toLocaleTimeString()}
                            </span>
                            <div className="flex items-center gap-2">
                              {entry.diffs.filter(d => d.severity === 'error').length > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  {entry.diffs.filter(d => d.severity === 'error').length} breaking
                                </span>
                              )}
                              {entry.diffs.filter(d => d.severity === 'warning').length > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                                  {entry.diffs.filter(d => d.severity === 'warning').length} warning
                                </span>
                              )}
                              {entry.diffs.filter(d => d.severity === 'info').length > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white">
                                  {entry.diffs.filter(d => d.severity === 'info').length} added
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {entry.diffs.map((d, j) => (
                              <div key={j} className="flex items-center gap-2 text-[10px]">
                                <span className={`font-mono ${d.severity === 'error' ? 'text-red-500' : d.severity === 'warning' ? 'text-yellow-500' : 'text-slate-500'}`}>
                                  {d.type === 'removed' ? '−' : d.type === 'added' ? '+' : '~'}
                                </span>
                                <code className="font-mono text-slate-600 dark:text-[#A0A0A0]">{d.path}</code>
                                {d.oldType && d.newType && (
                                  <span className="text-slate-400 dark:text-[#707070]">{d.oldType} → {d.newType}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : outputTab === 'architect' ? (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <FullStackArchitectView isDark={isDark} />
                </div>
              ) : outputTab === 'diff' ? (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <SmartDiffView key={diffSeedKey} isDark={isDark} initialContent={diffSeedContent || undefined} />
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  {slugTarget?.tier === 2 && slugTarget.key === outputTab && (
                    <div className="flex-none px-4 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20">
                      {slugTarget.label} output is a scaffold — review and adjust types, constraints, and relations before production use.
                    </div>
                  )}
                  <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    theme={isDark ? "vs-dark" : "light"}
                    language={outputTab === 'doc' ? 'markdown' : monacoLanguageForTarget(outputTab)}
                    value={getWorkbenchEditorText(outputTab, outputs, outputState)}
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
                className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold hover:text-slate-950 dark:hover:text-white"
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
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all active:scale-95 ${outputTab === tab.id ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-md' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
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
            <div className="absolute top-0 inset-x-0 h-1 bg-slate-900 dark:bg-white" />
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:border-white/10">
              <Crown size={32} className="text-slate-700 dark:text-white" />
            </div>
            
            <h2 className="text-lg font-black text-slate-900 dark:text-[#E8E8E8] mb-2 font-sans tracking-tight">
              Unlock TypeMorph
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6 font-sans">
              You've reached your free daily limit. Upgrade to <b>TypeMorph Pro</b> to unlock unlimited conversions, bulk folder mode, and local file sync.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  trackProClick('workbench_paywall_pricing');
                  window.open('https://typemorph.dev/pricing', '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-sm shadow-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
              >
                Get Lifetime Access
                <span className="text-xs opacity-70 bg-white/20 dark:bg-black/10 px-2 py-0.5 rounded-full">$25 once</span>
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
