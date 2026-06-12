import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, HelpCircle, GitBranch, Cpu, Code, ShieldCheck, Zap } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'TypeMorph 使い方ガイド | ヘルプ＆ドキュメント',
  description: 'ローカルファーストのスキーマ設計・コード生成ツール TypeMorph の使い方。インタラクティブな関係グラフの編集方法やASTリファクタリング、プライバシー設定について解説。',
};

export default function JapaneseHelpPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link prefetch={false} href="/jp" className="inline-flex items-center gap-2 text-sm font-mono text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-12 hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Hubに戻る
        </Link>

        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-6 border border-indigo-100 dark:border-indigo-900">
            <BookOpen size={12} /> ワークベンチ ドキュメント
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.1]">
            TypeMorph <span className="text-indigo-600">使い方ガイド</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            デベロッパー向け公式ドキュメントへようこそ。TypeMorphは、100%ブラウザ内で完結するローカルファーストなスキーマ設計プラットフォームです。
          </p>
        </div>

        <div className="prose prose-slate lg:prose-lg max-w-none dark:prose-invert
          prose-headings:font-mono prose-headings:tracking-tight
          prose-p:font-medium prose-p:leading-relaxed
          prose-strong:text-indigo-700 dark:prose-strong:text-indigo-400 prose-strong:font-bold
          prose-blockquote:border-l-4 prose-blockquote:border-indigo-600 prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-950/10 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic">
          
          <h2>1. 基本的な使い方</h2>
          <p>
            TypeMorphの基本操作は非常にシンプルです。左右に分割された2ペイン構造を採用しています：
          </p>
          <ul>
            <li><strong>インプットペイン（左側）:</strong> 生のデータまたはスキーマ（JSONペイロード、SQLのCREATE TABLE文、cURLコマンド、CSV、XMLなど）を貼り付けます。</li>
            <li><strong>アウトプットペイン（右側）:</strong> 即座にパースされ型定義が生成されます。タブを切り替えることで、TypeScript、Zod、Rust、Go、SQLなどの出力形式を動的に選択できます。</li>
          </ul>

          <h2>2. インタラクティブ関係グラフでの「直接編集」</h2>
          <p>
            ネストされたオブジェクトなどの複雑な構造をパースすると、エンジンが抽象構文木（AST）を構築し、<strong>Graph</strong>タブにデータの関係性を視覚的なノードグラフとして描画します。
          </p>
          <blockquote>
            <strong>💡 プロの知恵: グラフからの直接リネーム</strong><br />
            描画されたノードグラフ内のフィールド名を直接クリックすると、その場で名前を編集できます。 
            入力後に <code>Enter</code> を押すと、変更内容がAST全体に反映され、TypeScriptやZodだけでなく、GoやRust、SQLなど右側に出力される**すべてのコードがリアルタイムで自動的に書き換えられます**。
          </blockquote>

          <h2>3. 説明可能なリファクタリング (Explainable Logic)</h2>
          <p>
            ネストした同じ構造のオブジェクトがJSONに含まれている場合、TypeMorphのASTエンジンは自動的にそれらを検出し、共通の共有型（例：<code>SharedUser</code>）としてマージ（ユニフィケーション）してコードをクリーンに保ちます：
          </p>
          <ul>
            <li><strong>自動マージ（DRY原則）:</strong> 重複する構造が自動的に一つのインターフェースに抽出されます。</li>
            <li><strong>マージの分離 (Split):</strong> 型を共通化せず個別のオブジェクトとして定義したい場合は、出力コード上部に表示される「決定事項（Decisions）」パネルからワンクリックで「Split」を選択して別々の構造に戻すことができます。また、名前も手動でリネーム可能です。</li>
          </ul>

          <h2>4. プライバシーとAPIキー設定 (BYOK)</h2>
          <p>
            社内コードやデータの完全な主権と機密保持のため、TypeMorphは完全に安全なサンドボックス設計となっています。
          </p>
          <ul>
            <li><strong>ローカル処理:</strong> 基本的なコード解析やコンバート処理は、すべてブラウザのWeb Worker内で行われ、外部サーバーへの通信は発生しません。</li>
            <li><strong>BYOK (Bring Your Own Key) AI:</strong> テストデータのAI合成やエラー自動修復機能を利用する場合、ご自身のGoogle Gemini APIキーを画面上部の入力欄にセットします。AIとの通信はブラウザから直接Google公式APIに対して直接行われ、中間のプロキシサーバー等でのキーの傍受やデータの蓄積は物理的に行われません。</li>
          </ul>

          <h2>5. PWA (プログレッシブウェブアプリ) による完全オフライン対応</h2>
          <p>
            TypeMorphはPCやモバイルOSにアプリとして直接インストール可能です。トップナビゲーションの「Install App」ボタンをクリックしてインストールすると、次回から**インターネットに接続されていない環境（完全オフライン）でも完璧に動作**し、開発マシンの恒久的なローカルツールとして使用できます。
          </p>

          <p className="text-sm text-slate-400 mt-12">
            最終更新日: 2026年6月
          </p>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
