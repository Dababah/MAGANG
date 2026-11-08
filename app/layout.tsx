import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./figma.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal Pernyataan Pekerja - PT Kereta Api Indonesia",
  description:
    "Sistem manajemen dan persetujuan pernyataan pekerja PT Kereta Api Indonesia (Persero).",
  keywords: "KAI, Pernyataan, Portal Pekerja, Persetujuan",
  authors: [{ name: "PT Kereta Api Indonesia" }],
  icons: {
    icon: "/logo-kai-icon.svg",
    apple: "/logo-kai-icon.svg",
  },
  openGraph: {
    title: "Portal Pernyataan Pekerja KAI",
    description:
      "Sistem manajemen dan persetujuan pernyataan pekerja PT Kereta Api Indonesia",
    images: [{ url: "/logo-kai.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
