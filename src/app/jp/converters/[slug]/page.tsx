import React from 'react';
import TypeFlowApp from '../../../page';
import { converters } from '@/data/converters';
import fs from 'fs';
import path from 'path';
import { ShieldCheck, Crown, ArrowRight, BookOpen } from 'lucide-react';

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
  const baseUrl = 'https://typeflow-pro.pages.dev';
  
  const fromName = slug.split('-to-')[0].toUpperCase();
  const toName = slug.split('-to-').pop()?.toUpperCase();

  return {
    title: `${fromName}を${toName}に変換 - セキュアなエンジニアリングガイド | TypeFlow Pro`,
    description: `JSONやSQLから${toName}を自動生成。完全にローカルで動作する、日本エンジニアのための安全な型定義生成ツール。`,
    alternates: {
      canonical: `${baseUrl}/jp/converters/${slug}`,
    },
    openGraph: {
      title: `${fromName} to ${toName} 変換`,
      description: `セキュアなローカルファースト開発ユーティリティ。`,
      url: `${baseUrl}/jp/converters/${slug}`,
      siteName: 'TypeFlow',
      type: 'website',
    }
  };
}

export default async function JapaneseConverterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const converter = converters.find((c) => c.slug === slug);

  if (!converter) return <div>Converter not found</div>;

  let fileContent = '';
  try {
    const contentPath = path.join(process.cwd(), 'src', 'data', 'content', 'jp', `${slug}.html`);
    fileContent = fs.readFileSync(contentPath, 'utf8');
  } catch (e) {
    console.error(`Japanese content not found for ${slug}`);
  }

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
          <a href="/" className="hover:text-blue-600">Home</a>
          <span>/</span>
          <a href="/converters" className="hover:text-blue-600">Converters</a>
          <span>/</span>
          <span className="text-blue-600">日本語版</span>
        </nav>
      </div>

      <TypeFlowApp defaultView="app" initialSlug={slug} />

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
          dangerouslySetInnerHTML={{ __html: fileContent }}
        />
        
        <div className="mt-24 p-12 rounded-[3rem] bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Crown size={120} />
          </div>
          <h3 className="text-2xl font-black mb-8 text-slate-900">開発者向け FAQ</h3>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="font-black text-slate-900 mb-2">処理はローカルのみで行われますか？</p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">はい。TypeFlow Proは完全にブラウザのサンドボックス内で動作します。Web Workersを使用して高速な計算を行いますが、JSONやSQL、APIデータがリモートサーバーに送信されることは一切ありません。</p>
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
                  <a
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
                  </a>
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
                <a 
                  key={tool.slug}
                  href={`/jp/converters/${tool.slug}`}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center text-center"
                >
                  {tool.title.split(' - ')[0]} (JP)
                </a>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
