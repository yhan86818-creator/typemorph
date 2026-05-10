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
  title: "TypeFlow Pro | Local-First Developer Workspace",
  description: "Securely generate TypeScript, Zod, and multi-language code from any data source. 100% private, 100% local.",
   metadataBase: new URL('https://typeflow-pro.pages.dev'),
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "TypeFlow Pro | Local-First Developer Workspace",
    description: "Securely generate TypeScript, Zod, and multi-language code from any data source.",
    url: 'https://typeflow-pro.pages.dev',
    siteName: 'TypeFlow Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  verification: {
    google: "dyitLt80YqDWnYz6__XIEwhrunV4U1-KU8ODTGzuK_s",
  },
};

export const viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
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
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics gaId="G-BNX0SLDWBX" />
        {children}
      </body>
    </html>
  );
}
