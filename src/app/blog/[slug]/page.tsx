import React from 'react';
import { ShieldCheck, Calendar, User, ArrowLeft } from 'lucide-react';

const posts = [
  {
    slug: 'security-risks-of-online-converters',
    title: 'The Hidden Security Risks of Online JSON Converters',
    date: '2026-05-10',
    author: 'TypeFlow Security Team',
    content: `
      <p>Every day, thousands of developers paste sensitive API responses and configuration files into online JSON formatters and converters. While these tools are convenient, they pose a significant security risk to enterprise data.</p>
      
      <h2>1. Data Logging on Servers</h2>
      <p>Most online converters send your data to a backend server for processing. This means your proprietary JSON structures, and potentially sensitive production data, are stored in logs that you do not control.</p>
      
      <h2>2. Third-Party Analytics and Tracking</h2>
      <p>Many free tools are monetized through ads and tracking. When you paste data, third-party scripts may capture snippets of your input for profiling or analytics purposes.</p>
      
      <h2>3. The Local-First Solution</h2>
      <p>At TypeFlow, we believe security shouldn't be a trade-off for convenience. By using a local-first architecture, all processing happens strictly within your browser's memory. No data is ever sent to our servers.</p>
    `
  },
  {
    slug: 'nextjs-type-safety-workflow',
    title: 'Ultimate Type-Safe Workflow for Next.js 15',
    date: '2026-05-12',
    author: 'TypeFlow Engineering',
    content: `
      <p>Achieving true type safety in a Next.js application requires more than just TypeScript. It requires runtime validation to ensure that the data coming from your API actually matches your expectations.</p>
      
      <h2>The Zod + React Query Stack</h2>
      <p>Combining Zod for validation and React Query for data fetching is the gold standard for modern web development. It allows you to catch errors at the boundary, before they crash your UI.</p>
      
      <h2>Automating the Boilerplate</h2>
      <p>The manual creation of interfaces and schemas is the most tedious part of this process. Using tools like TypeFlow, you can automate this entire workflow, generating types and schemas directly from your API responses.</p>
    `
  }
];

export async function generateStaticParams() {
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  return {
    title: `${post?.title} | TypeFlow Blog`,
    description: post?.title,
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) return <div>Post not found</div>;

  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-32 pb-20">
      <article className="max-w-3xl mx-auto px-6">
        <a href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-accent mb-12 hover:underline">
          <ArrowLeft size={16} /> Back to Blog
        </a>
        
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
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        <footer className="mt-20 p-8 rounded-3xl bg-primary text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-primary/20">
          <div>
            <h3 className="text-xl font-bold mb-2">Want to automate this?</h3>
            <p className="text-slate-300 text-sm">Use TypeFlow to generate your types and schemas in seconds.</p>
          </div>
          <a href="/?view=app" className="px-6 py-3 bg-accent rounded-xl font-bold hover:bg-accent/90 transition-colors">
            Try TypeFlow Now
          </a>
        </footer>
      </article>
    </main>
  );
}
