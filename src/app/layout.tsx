import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewProvider } from "@/lib/context/ViewContext";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
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
  metadataBase: new URL("https://retailagentos.com"),
  title: "RetailAgentOS — Agentic Commerce on UCP",
  description: "UCP gives commerce the rails. RetailAgentOS fills the gap — making merchant rules machine-readable so AI shopping agents can act on them correctly.",
  openGraph: {
    title: "RetailAgentOS — Agentic Commerce on UCP",
    description: "UCP gives commerce the rails. RetailAgentOS fills the gap — making merchant rules machine-readable so AI shopping agents can act on them correctly.",
    siteName: "RetailAgentOS",
    url: "https://retailagentos.com",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RetailAgentOS — UCP gives commerce the rails, RetailAgentOS adds the reasoning.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RetailAgentOS — Agentic Commerce on UCP",
    description: "UCP gives commerce the rails. RetailAgentOS fills the gap — making merchant rules machine-readable so AI shopping agents can act on them correctly.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full bg-slate-50 antialiased`}>
      <body className="flex h-full flex-col font-sans text-slate-900 bg-slate-50">
        <ViewProvider>
          <NavBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
          <Footer />
          <div className="border-t border-slate-200 bg-slate-50 shrink-0">
            <p className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8 text-[11px] text-slate-400">
              For developers: open{' '}
              <a href="/specs" className="text-slate-500 hover:text-slate-700 transition-colors">specs</a>,{' '}
              reference implementation, live{' '}
              <a href="/demo" className="text-slate-500 hover:text-slate-700 transition-colors">playground</a>.
              {' '}For AI agents: start at{' '}
              <a href="/agents.md" className="text-slate-500 hover:text-slate-700 transition-colors">/agents.md</a>
              {' '}and{' '}
              <a href="/.well-known/ucp" className="text-slate-500 hover:text-slate-700 transition-colors">/.well-known/ucp</a>.
            </p>
          </div>
        </ViewProvider>
      </body>
    </html>
  );
}
