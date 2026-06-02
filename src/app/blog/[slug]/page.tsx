import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Calendar, User, ArrowLeft } from 'lucide-react';
import { blogPosts as posts } from '@/data/blog-posts';

export async function generateStaticParams() {
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  const baseUrl = 'https://typeflow-pro.pages.dev';
  return {
    title: `${post?.title} | TypeFlow Blog`,
    description: post?.excerpt || post?.title,
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
    openGraph: {
      title: post?.title,
      description: post?.excerpt,
      url: `${baseUrl}/blog/${slug}`,
      siteName: 'TypeFlow Pro',
      type: 'article',
      publishedTime: post?.date,
      authors: [post?.author || 'TypeFlow Team'],
    }
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) return <div>Post not found</div>;

  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-32 pb-20">
      <article className="max-w-3xl mx-auto px-6">
        <Link prefetch={false} href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-12 hover:underline">
          <ArrowLeft size={16} /> Back to Blog
        </Link>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">
          <Link prefetch={false} href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link prefetch={false} href="/blog" className="hover:text-blue-600">Blog</Link>
          <span>/</span>
          <span className="text-blue-600">Technical Analysis</span>
        </nav>
        
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-6 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-6 text-sm text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-2"><Calendar size={16} /> {post.date}</span>
            <span className="flex items-center gap-2"><User size={16} /> {post.author}</span>
          </div>
        </header>

        <div 
          className="prose prose-slate lg:prose-xl max-w-none 
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-p:text-slate-600 prose-p:leading-relaxed
          prose-strong:text-slate-900"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />
        
        <footer className="mt-20 p-8 rounded-3xl bg-primary text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-primary/20">
          <div>
            <h3 className="text-xl font-bold mb-2">Want to automate this?</h3>
            <p className="text-slate-300 text-sm">Use TypeFlow to generate your types and schemas in seconds.</p>
          </div>
          <Link prefetch={false} href="/?view=app" className="px-6 py-3 bg-accent rounded-xl font-bold hover:bg-accent/90 transition-colors">
            Try TypeFlow Now
          </Link>
        </footer>
      </article>
    </main>
  );
}
