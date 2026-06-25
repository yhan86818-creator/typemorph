import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Script from "next/script";

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
    default: "TypeMorph | JSON to Zod — 160+ Schema Formats, Runs in Browser",
    template: "%s | TypeMorph"
  },
  description: "The best way to convert JSON to Zod schemas. Migrate Zod v3 → v4 automatically, generate TypeScript, Go, Rust and 160+ formats. 100% browser-local, no signup.",
  metadataBase: new URL('https://typemorph.dev'),
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "TypeMorph | JSON to Zod — 160+ Schema Formats, Runs in Browser",
    description: "The best way to convert JSON to Zod schemas. Migrate Zod v3 → v4 automatically, generate TypeScript, Go, Rust and 160+ formats. 100% browser-local, no signup.",
    url: 'https://typemorph.dev',
    siteName: 'TypeMorph',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TypeMorph — JSON to Zod, 160+ Schema Formats, Runs in Browser'
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypeMorph | JSON to Zod — 160+ Schema Formats, Runs in Browser',
    description: 'The best way to convert JSON to Zod schemas. Migrate Zod v3 → v4 automatically. 160+ formats, 100% browser-local.',
    images: ['/og-image.png'],
  },
  verification: {
    google: "dyitLt80YqDWnYz6__XIEwhrunV4U1-KU8ODTGzuK_s",
  },
  // PWA
  applicationName: 'TypeMorph',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TypeMorph',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#030712',
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "TypeMorph",
  "alternateName": "TypeMorph",
  "url": "https://typemorph.dev",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://typemorph.dev/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "TypeMorph",
  "url": "https://typemorph.dev",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web, Windows, macOS, Linux",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Convert JSON to Zod, TypeScript, Go, Rust, Prisma and 160+ formats with real type inference. Detects email, UUID, URL, datetime, enums and int vs float. Includes schema quality grading, breaking change detection, API drift check, and a CLI for CI pipelines. 100% browser-local — your data never leaves your machine.",
  "featureList": [
    "JSON to Zod schema conversion with semantic type inference",
    "160+ output formats including TypeScript, Go, Rust, Prisma, Drizzle",
    "OpenAPI and JSON Schema input support",
    "Schema quality grading (A–F)",
    "Breaking change detection",
    "API schema drift detection without OpenAPI spec",
    "Environment diff (staging vs production)",
    "MCP tool definition generation",
    "OpenAI function calling schema generation",
    "Vercel AI SDK tool generation",
    "LLM output validation",
    "VS Code extension",
    "CLI tool (typemorph-cli on npm)",
    "100% browser-local — no data upload"
  ],
  "screenshot": "https://typemorph.dev/hero-preview.png",
  "softwareVersion": "0.6.0",
  "author": {
    "@type": "Organization",
    "name": "TypeMorph",
    "url": "https://typemorph.dev"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <GoogleAnalytics gaId="G-BNX0SLDWBX" />
        {children}
      </body>
    </html>
  );
}
