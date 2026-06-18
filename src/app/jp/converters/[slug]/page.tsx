import React from 'react';
import Link from 'next/link';
import TypeMorphApp from '../../../page';
import { converters } from '@/data/converters';
import fs from 'fs';
import path from 'path';
import { ShieldCheck, Crown, ArrowRight, BookOpen } from 'lucide-react';
import { getConverterSeo } from '@/lib/seo';
import { notFound } from 'next/navigation';

const blogPosts = [
  {
    slug: 'security-risks-of-online-converters',
    title: 'オンラインJSON変換ツールの隠れたセキュリティリスク',
    excerpt: '機密データをサードパーティのウェブツールに貼り付けることがなぜ危険なのか、そしてどうすれば安全を保てるのか。',
    category: 'セキュリティ分析',
    categoryColor: 'text-blue-600',
    keywords: ['json', 'security', 'typescript', 'zod', 'prisma', 'env', 'sql'],
  },
  {
    slug: 'nextjs-type-safety-workflow',
    title: 'Next.js 15における究極の型安全ワークフロー',
    excerpt: 'Zod、React Query、TypeScriptを組み合わせた、堅牢なAPI統合のディープダイブ。',
    category: 'エンジニアリングガイド',
    categoryColor: 'text-purple-600',
    keywords: ['typescript', 'zod', 'react', 'nextjs', 'query', 'prisma', 'graphql'],
  },
  {
    slug: 'schema-first-engineering-future',
    title: 'コード生成の先へ：なぜスキーマファースト開発が未来なのか',
    excerpt: 'コード生成は始まりに過ぎません。スキーマファーストのアプローチが統合バグの90%を排除する方法を紹介します。',
    category: 'アーキテクチャの洞察',
    categoryColor: 'text-blue-600',
    keywords: ['architecture', 'schema', 'zod', 'typescript', 'automation'],
  },
];

export async function generateStaticParams() {
  return converters.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const converter = converters.find((c) => c.slug === slug);
  const seo = getConverterSeo(slug, 'jp');

  const fromName = slug.split('-to-')[0].toUpperCase();
  const toName = slug.split('-to-').pop()?.toUpperCase();

  return {
    title: `${fromName}を${toName}に変換 - セキュアなエンジニアリングガイド | TypeMorph`,
    description: converter?.description || `JSONやSQLから${toName}を自動生成。ブラウザ内だけで動作する型定義ツール。`,
    alternates: {
      canonical: seo.canonical,
    },
    robots: { index: false, follow: false },
    openGraph: {
      title: `${fromName} to ${toName} 変換`,
      description: `セキュアなローカルファースト開発ユーティリティ。`,
      url: seo.canonical,
      siteName: 'TypeMorph',
      type: 'website',
    },
  };
}

export default async function JapaneseConverterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const converter = converters.find((c) => c.slug === slug);

  if (!converter) return notFound();

  let fileContent = '';
  try {
    const contentPath = path.join(process.cwd(), 'src', 'data', 'content', 'jp', `${slug}.html`);
    fileContent = fs.readFileSync(contentPath, 'utf8');
  } catch (e) {
    console.error(`Japanese content not found for ${slug}`);
  }

  // Safe fallback content generator (Build-time only)
  const generateFallbackContent = (c: any) => {
    const name = c.title.split(' - ')[0];
    const tech = c.slug.split('-').pop()?.toUpperCase();
    
    return `
      <p>現代のソフトウェア開発において、データ構造を迅速かつ正確に変換する能力は、単なる利便性ではなく、競争上の不可欠な要素です。当社の<strong>${c.title}</strong>は、プロフェッショナルな開発の最高基準を満たすよう設計されており、異種データ形式間にシームレスで安全なローカルファーストの架け橋を提供します。</p>
      
      <h2>ローカルファースト開発ツールへの転換</h2>
      <p>長年、開発者は機密性の高いJSON、SQL、またはAPIペイロードをリモートサーバーで処理するクラウドベースのコンバーターに依存してきました。しかし、GDPRやSOC2などのデータプライバシー規制が厳しくなるにつれ、独自のスキーマをサードパーティのバックエンドに送信することは重大なセキュリティリスクとなっています。TypeMorphは、このリスクを排除するために誕生しました。<strong>${name}</strong>エンジンを使用してすべての変換ロジックをブラウザ内で100%ローカルに実行することで、知的財産や顧客データが安全な環境から離れないことを保証します。</p>
      
      <h2>なぜ ${name} を使用するのか？</h2>
      <p>大規模なレガシー移行に取り組んでいる場合でも、${tech}を使用してグリーンフィールドプロジェクトを構築している場合でも、型、クラス、スキーマのマッピングに必要な手作業はヒューマンエラーが発生しやすいものです。当社の ${name} ユーティリティはこのプロセスを自動化し、ターゲット言語の慣習的なパターンに従いながら、完璧な構造的整合性を維持します。JSONから${tech}に変換する場合、ツールはオプショナル属性、ネストされた関係、および命名規則を自動的にインテリジェントに推論します。</p>
      
      <h2>${name} ワークベンチの高度な機能</h2>
      <ul>
        <li><strong>低レイテンシ処理:</strong> サーバーサイドの代替ツールとは異なり、当社のローカルエンジンは即座にフィードバックを提供します。入力するとリアルタイムで${tech}出力が生成され、迅速なイテレーションとデバッグが可能になります。</li>
        <li><strong>ルールベースの構造解析:</strong> ローカルのAST推論エンジンが、複雑・深くネストされた入力を解析し、${tech}生成が始まる前にクリーンで変換可能な構造に自動的に整形します。</li>
        <li><strong>プロフェッショナルな構文ハイライト:</strong> Monaco Editor（VS Codeと同じコア）を搭載し、慣れ親しんだショートカット、自動インデント、プロフェッショナルグレードのワークスペースを提供します。</li>
        <li><strong>包括的なエクスポートオプション:</strong> 基本的な型に加えて、Proユーザーは1クリックで高度なZodスキーマ、React Queryフック、Prismaモデルを生成できます。</li>
      </ul>

      <h2>エンジニアリングワークフローの最適化</h2>
      <p><strong>${c.title}</strong>を日常のルーチンに組み込むことで、繰り返しの多い手作業を何時間も節約できます。サードパーティのサービスから複雑なAPIレスポンスを受け取った場合、手動でインターフェースを記述するのに30分費やす代わりに、ここにペイロードを貼り付けるだけで、数秒でプロダクションレディな${tech}コードを取得できます。このスピードにより、チームはボイラープレートの管理ではなく、ビジネスロジックに集中できるようになります。</p>
      
      <h3>セキュリティとコンプライアンス</h3>
      <p>TypeMorphはアカウント登録やデータのアップロードを必要としないため、エアギャップ環境や高セキュリティの企業ネットワークとも完全に互換性があります。開発者ツールは、データパイプラインの整合性を損なうことなくユーザーを支援すべきであると私たちは信じています。</p>

      <h2>比較：TypeMorph vs. 従来のコンバーター</h2>
      <p>標準的なコンバーターは、大幅な修正を必要とする汎用的で「フラット」なコードを出力することがよくあります。当社の<strong>${name}</strong>ロジックは複雑なデータ型を理解し、多態的な構造を処理し、${tech}の公式ドキュメントに従った慣習的なコードを生成します。適切なケース変換から正しい属性装飾（RustのSerdeやJavaのLombokなど）まで、実世界のプロダクションユースに合わせてエンジンを調整しています。</p>
      
      <blockquote>
        「TypeMorphは、データモデリングの処理方法を再定義しました。ローカルファーストのプライバシーとルールベースの解析の組み合わせは、現代の開発者にとってゴールドスタンダードです。」
      </blockquote>
      
      <h3>開発スタックの将来性</h3>
      <p>PythonからGoへ、あるいはSQL主体のバックエンドからGraphQLフロントエンドへ移行する場合でも、TypeMorphは常にあなたのパートナーです。${tech}用の特殊なフォーマットを含む160以上のコンバーターをサポートしており、キャリアの次のアーキテクチャシフトにいつでも対応できます。</p>
      
      <p>今すぐ <strong>${name}</strong> の使用を開始し、プロフェッショナルなローカルファーストのエンジニアリングワークベンチが生産性にもたらす違いを体験してください。</p>
    `;
  };

  const contentToDisplay = fileContent || generateFallbackContent(converter);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": converter.title,
    "description": converter.description,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <div className="relative bg-[#F8FAFC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-7xl mx-auto px-6 pt-12 -mb-12 relative z-10">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Link prefetch={false} href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link prefetch={false} href="/converters" className="hover:text-blue-600">Converters</Link>
          <span>/</span>
          <span className="text-blue-600">日本語版</span>
        </nav>
      </div>

      <TypeMorphApp defaultView="app" initialSlug={slug} />

      {/* Technical Manual / Documentation Section */}
      <div className="max-w-4xl mx-auto px-6 py-32 border-t border-slate-100 mt-24">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-6">
            <ShieldCheck size={12} /> {converter.category} • エンジニアリング・ドキュメント
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-slate-900 leading-tight">
            {converter.h1 || converter.title}
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
            この技術ガイドでは、<strong>{converter.slug.replace(/-/g, ' ')}</strong> エンジンの詳細な分析、実装のベストプラクティス、およびデータセキュリティ基準について解説します。
          </p>
        </div>

        <div 
          className="prose prose-slate lg:prose-lg max-w-none 
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-medium
          prose-strong:text-slate-900 prose-strong:font-black
          prose-ul:list-disc prose-li:text-slate-600 prose-li:font-medium
          prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-blue-50/50 prose-blockquote:p-8 prose-blockquote:rounded-r-3xl prose-blockquote:not-italic
          prose-img:rounded-3xl prose-img:shadow-2xl"
          dangerouslySetInnerHTML={{ __html: contentToDisplay }}
        />
        
        <div className="mt-24 p-12 rounded-[3rem] bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Crown size={120} />
          </div>
          <h3 className="text-2xl font-black mb-8 text-slate-900">開発者向け FAQ</h3>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="font-black text-slate-900 mb-2">処理はローカルのみで行われますか？</p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">はい。TypeMorphは完全にブラウザのサンドボックス内で動作します。Web Workersを使用して高速な計算を行いますが、JSONやSQL、APIデータがリモートサーバーに送信されることは一切ありません。</p>
            </div>
            <div>
              <p className="font-black text-slate-900 mb-2">商用プロジェクトで使用できますか？</p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">もちろんです。このツールは、GDPRコンプライアンスやデータプライバシーを必要とするプロのソフトウェアエンジニア向けに設計されています。多くのスタートアップや金融機関の開発者に信頼されています。</p>
            </div>
          </div>
        </div>

        {/* Blog Articles Section */}
        {(() => {
          const slugWords = slug.split('-');
          const relatedPosts = blogPosts.filter(post =>
            post.keywords.some(kw => slugWords.includes(kw))
          );
          if (relatedPosts.length === 0) return null;
          return (
            <div className="mt-20 pt-20 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-8">
                <BookOpen size={20} className="text-blue-600" />
                <h2 className="text-2xl font-black">エンジニアリングブログより</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedPosts.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group p-8 rounded-[2rem] bg-white border border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-4 ${post.categoryColor}`}>{post.category}</div>
                    <h3 className="text-lg font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">{post.title}</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
                      記事を読む <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Related Utilities */}
        <div className="mt-20 pt-20 border-t border-slate-200">
          <h2 className="text-2xl font-black mb-8">関連ツール</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {converters
              .filter(c => c.slug !== slug)
              .slice(0, 8)
              .map(tool => (
                <Link 
                  key={tool.slug}
                  href={`/jp/converters/${tool.slug}`}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center text-center"
                >
                  {tool.title.split(' - ')[0]} (JP)
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
