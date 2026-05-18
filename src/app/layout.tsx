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
    default: "SchemaForge Pro | 300+ Local-First Developer Tools & Schema Generators",
    template: "%s | SchemaForge Pro"
  },
  description: "The ultimate secure engineering workbench. 307+ local-first tools for database schemas, validation schemas, TypeScript, and SQL. 100% private.",
  metadataBase: new URL('https://schemaforge.pro'),
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "SchemaForge Pro | 300+ Local-First Developer Tools & Schema Generators",
    description: "The ultimate secure engineering workbench. 307+ local-first tools for database schemas, validation schemas, TypeScript, and SQL.",
    url: 'https://schemaforge.pro',
    siteName: 'SchemaForge Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SchemaForge Pro - The Local-First Developer Workbench'
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SchemaForge Pro | Local-First Developer Workspace',
    description: '307+ local-first schema and code generators for modern architects. 100% private.',
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
    "name": "SchemaForge Pro",
    "alternateName": "SchemaForge",
    "url": "https://schemaforge.pro",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://schemaforge.pro/?q={search_term_string}",
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
