import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewProvider } from "@/lib/context/ViewContext";
import { NavBar } from "@/components/layout/NavBar";
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
  title: "RetailAgentOS — Agentic Commerce on UCP",
  description: "RetailAgentOS makes small merchants agent-ready. Built on the Universal Commerce Protocol.",
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
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </ViewProvider>
      </body>
    </html>
  );
}
