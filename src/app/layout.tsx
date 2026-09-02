import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewProvider } from "@/lib/context/ViewContext";
import { AppShell } from "@/components/layout/AppShell";
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
    // `data-scroll-behavior="smooth"` is required in Next.js 16 for any document that enables
    // `scroll-behavior: smooth` — the showcase routes do, via `:root:has(.showcase-header)` in
    // globals.css. Without it Next no longer suspends smooth scrolling during route transitions,
    // so navigating to or from the demo would animate its jump to the top instead of being instant.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-slate-50 antialiased`}
    >
      <body className="flex h-full flex-col font-sans text-slate-900 bg-slate-50">
        <ViewProvider>
          <AppShell>{children}</AppShell>
        </ViewProvider>
      </body>
    </html>
  );
}
