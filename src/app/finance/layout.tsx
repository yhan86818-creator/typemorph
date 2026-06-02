import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'TypeFlow Finance | Secure SWIFT MT/MX & FIX Protocol Parser for Enterprises',
  description: 'The 100% local-first financial data workbench. Parse SWIFT MT, ISO 20022, and FIX Protocol directly in your browser. Zero data leaks. GDPR & SOC2 friendly. Enterprise license from $99.',
  alternates: {
    canonical: 'https://typeflow-pro.pages.dev/finance',
  },
  openGraph: {
    title: 'TypeFlow Finance | SWIFT MT/MX & FIX Protocol Parser',
    description: 'Local-first financial engineering workbench. Parse SWIFT, ISO 20022, FIX Protocol with zero data exposure. Built for compliance-heavy environments.',
    url: 'https://typeflow-pro.pages.dev/finance',
    siteName: 'TypeFlow Pro',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypeFlow Finance | Secure SWIFT & FIX Protocol Workbench',
    description: '100% local-first. Zero telemetry. Enterprise-grade SWIFT MT/MX, ISO 20022 & FIX parsing in the browser.',
    images: ['/og-image.png'],
  },
  keywords: [
    'SWIFT MT to MX', 'ISO 20022', 'FIX protocol converter', 'SWIFT parser browser',
    'local first financial tools', 'GDPR compliant developer tool', 'fintech developer workbench',
    'SWIFT MT103 parser', 'ISO 20022 schema generator', 'FIX protocol TypeScript'
  ],
};

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
