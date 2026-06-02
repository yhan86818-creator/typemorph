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
    default: "TypeFlow Pro | The Elite Local-First Schema Engineering Workbench",
    template: "%s | TypeFlow Pro"
  },
  description: "Institutional-grade schema transformation platform. 290+ local-first tools for database design, API synthesis, and code generation. 100% private, no-cloud processing for corporate data sovereignty.",
  metadataBase: new URL('https://typeflow-pro.pages.dev'),
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "TypeFlow Pro | 290+ Institutional-Grade Local-First Developer Tools",
    description: "Secure your architecture with the world's most comprehensive local-first workbench. Zero data retention, BYOK AI synthesis, and 290+ parsers.",
    url: 'https://typeflow-pro.pages.dev',
    siteName: 'TypeFlow Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TypeFlow Pro - The Elite Local-First Developer Workbench'
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypeFlow Pro | Elite Schema Engineering Workbench',
    description: '290+ local-first tools for modern architects. 100% private data sovereignty.',
    images: ['/og-image.png'],
  },
  verification: {
    google: "dyitLt80YqDWnYz6__XIEwhrunV4U1-KU8ODTGzuK_s",
  },
  // PWA
  applicationName: 'TypeFlow Pro',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TypeFlow Pro',
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
  "name": "TypeFlow Pro",
  "alternateName": "TypeFlow",
  "url": "https://typeflow-pro.pages.dev",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://typeflow-pro.pages.dev/?q={search_term_string}",
    "query-input": "required name=search_term_string"
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
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              // Register Service Worker for PWA offline support
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
        <GoogleAnalytics gaId="G-BNX0SLDWBX" />
        {children}
      </body>
    </html>
  );
}
