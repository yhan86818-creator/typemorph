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
        <GoogleAnalytics gaId="G-BNX0SLDWBX" />
        {children}
      </body>
    </html>
  );
}
