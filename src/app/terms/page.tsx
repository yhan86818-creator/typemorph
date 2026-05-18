import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Scale } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'Terms of Service - SchemaForge Pro',
  description: 'Rules and guidelines for using the SchemaForge Pro engineering workbench.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-mono text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-12 hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Back to Hub
        </Link>

        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest mb-6 border border-slate-300 dark:border-slate-700">
            <Scale size={12} /> Legal Agreement
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.1]">
            Terms of <span className="text-slate-500">Service.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            By accessing or using SchemaForge Pro, you agree to be bound by these terms. We keep it simple: use the tools responsibly, and don't sue us if your code breaks.
          </p>
        </div>

        <div className="prose prose-slate lg:prose-lg max-w-none dark:prose-invert
          prose-headings:font-mono prose-headings:tracking-tight
          prose-p:font-medium prose-p:leading-relaxed
          prose-strong:font-bold text-blue-700 dark:text-blue-400
          prose-ul:font-medium">
          
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing SchemaForge Pro, you agree to these Terms of Service. If you disagree with any part of the terms, then you do not have permission to access the Service.
          </p>

          <h2>2. Use of Service & Generated Code</h2>
          <p>
            SchemaForge Pro provides utility functions that transform data (JSON, SQL, code, etc.). <strong>You own all the code you generate using our tools.</strong> You are free to use the output in commercial applications, open-source projects, and enterprise environments without attribution.
          </p>

          <h2>3. Disclaimer of Warranties (The "No Guarantees" Clause)</h2>
          <p>
            The service is provided on an "AS IS" and "AS AVAILABLE" basis. While our parsing logic and AI models are highly advanced, they are not infallible. <strong>We make no warranties, expressed or implied, regarding the accuracy, reliability, or safety of the generated code.</strong>
          </p>
          <ul>
            <li>You are strictly responsible for reviewing and testing all output before deploying it to a production environment.</li>
            <li>We do not guarantee that the generated interfaces will perfectly match your backend logic under all edge cases.</li>
          </ul>

          <h2>4. Limitation of Liability</h2>
          <p>
            In no event shall SchemaForge Pro, nor its directors, employees, or partners, be liable for any indirect, incidental, special, consequential, or punitive damages—including but not limited to <strong>loss of profits, server downtime, data corruption, or security breaches</strong>—resulting from your use of the generated code or the service itself.
          </p>

          <h2>5. Acceptable Use</h2>
          <p>
            You agree not to use the service to decompile, reverse engineer, or maliciously attack the platform's infrastructure. While the application runs locally, attempting to overload our static hosting endpoints or AI proxy servers via automated botnets will result in a permanent IP ban.
          </p>

          <p className="text-sm text-slate-400 mt-12">
            Last Updated: May 2026
          </p>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
