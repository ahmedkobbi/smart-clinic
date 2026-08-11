import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { MantineProviderWrapper } from "@/components/mantine-provider-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Clinic — Clinical Practice Management Platform",
  description:
    "Enterprise-grade SaaS and on-premise practice-management platform for clinics. Glass UI, offline-first, secure-by-design, AI-assisted.",
  keywords: [
    "Smart Clinic",
    "EHR",
    "DPI",
    "clinical practice management",
    "healthtech",
    "RGPD",
    "HDS",
    "scheduling",
    "billing",
  ],
  authors: [{ name: "Smart Clinic" }],
  openGraph: {
    title: "Smart Clinic",
    description: "Clinical Practice Management Platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <style>{`
          /* Mantine + Tailwind coexistence: prevent specificity wars */
          .mantine-* { box-sizing: border-box; }
        `}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <MantineProviderWrapper>
          <Providers>
            {children}
            <Toaster />
            <Sonner />
          </Providers>
        </MantineProviderWrapper>
      </body>
    </html>
  );
}
