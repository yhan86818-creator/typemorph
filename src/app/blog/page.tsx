import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, User } from 'lucide-react';

const posts = [
  {
    slug: 'security-risks-of-online-converters',
    title: 'The Hidden Security Risks of Online JSON Converters',
    excerpt: 'Why pasting proprietary company data into third-party web tools is a major liability, and how to stay safe.',
    date: '2026-05-10',
    author: 'TypeFlow Security Team'
  },
  {
    slug: 'nextjs-type-safety-workflow',
    title: 'Ultimate Type-Safe Workflow for Next.js 15',
    excerpt: 'A deep dive into combining Zod, React Query, and TypeScript for bulletproof API integration.',
    date: '2026-05-12',
    author: 'TypeFlow Engineering'
  }
];

export const metadata = {
  title: 'TypeFlow Blog | Enterprise Security & TypeScript Best Practices',
  description: 'Expert insights on local-first development, security, and automating your Next.js workflow.',
};

export default function BlogListPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <header className="mb-20 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6">
            Insights & Guides
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            Master the art of type-safe development and learn how to keep your enterprise data secure.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <a 
              key={post.slug} 
              href={`/blog/${post.slug}`}
              className="group dev-card p-8 rounded-[2.5rem] bg-white flex flex-col hover:-translate-y-2 transition-all duration-300"
            >
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                <span className="flex items-center gap-1"><Calendar size={12} /> {post.date}</span>
                <span className="flex items-center gap-1"><User size={12} /> {post.author}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-accent transition-colors leading-tight">
                {post.title}
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                {post.excerpt}
              </p>
              <div className="mt-auto flex items-center gap-2 text-sm font-bold text-slate-900">
                Read Article <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
