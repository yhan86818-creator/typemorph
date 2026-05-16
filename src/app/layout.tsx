import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TypeFlow Pro | 300+ Local-First Developer Tools & Converters",
    template: "%s | TypeFlow Pro"
  },
  description: "The ultimate secure engineering workbench. 307+ local-first tools for TypeScript, Zod, Go, Rust, and SQL. 100% private data transformation.",
  metadataBase: new URL('https://typeflow-pro.pages.dev'),
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "TypeFlow Pro | 300+ Local-First Developer Tools & Converters",
    description: "The ultimate secure engineering workbench. 307+ local-first tools for TypeScript, Zod, Go, Rust, and SQL.",
    url: 'https://typeflow-pro.pages.dev',
    siteName: 'TypeFlow Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TypeFlow Pro - The Local-First Developer Workbench'
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypeFlow Pro | Local-First Developer Workspace',
    description: '307+ local-first tools for engineers. Securely generate types and schemas from any data.',
    images: ['/og-image.png'],
  },
  verification: {
    google: "dyitLt80YqDWnYz6__XIEwhrunV4U1-KU8ODTGzuK_s",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "TypeFlow Pro",
    "alternateName": "TypeFlow",
    "url": "https://typeflow-pro.pages.dev",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://typeflow-pro.pages.dev/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GoogleAnalytics gaId="G-BNX0SLDWBX" />
        {children}
      </body>
    </html>
  );
}
