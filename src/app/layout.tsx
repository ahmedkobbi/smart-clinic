import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
