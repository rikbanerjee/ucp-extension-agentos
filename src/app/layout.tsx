import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UCP Retail Semantics Extension Demo",
  description: "A developer-facing demo for extending Unified Commerce Protocol with retail semantics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full bg-slate-50 antialiased`}>
      <body className="flex h-full flex-col font-sans text-slate-900 bg-slate-50">
        <header className="border-b border-slate-200 bg-white shadow-sm shrink-0">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-semibold text-lg tracking-tight text-slate-900">
                UCP Extension Demo
              </Link>
              <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link href="/" className="hover:text-slate-900 transition-colors">Overview</Link>
                <Link href="/profile" className="hover:text-slate-900 transition-colors">Profile Viewer</Link>
                <Link href="/demo" className="hover:text-slate-900 transition-colors">Playground</Link>
                <Link href="/architecture" className="hover:text-slate-900 transition-colors">Architecture</Link>
                <Link href="/vision" className="hover:text-slate-900 transition-colors font-semibold text-slate-800 flex items-center gap-1">
                  RetailAgentOS
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5 font-semibold">
                    new
                  </span>
                </Link>
              </nav>
            </div>
            <div className="text-xs font-semibold text-slate-400">
              Demo Version 1.0
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
