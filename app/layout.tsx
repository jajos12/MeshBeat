import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MeshBeat | Synchronized Audio Streaming",
  description: "Turn multiple devices into a distributed speaker system. P2P synchronized audio playback with sub-millisecond precision.",
  keywords: ["audio", "sync", "streaming", "P2P", "WebRTC", "multi-device", "speaker"],
  authors: [{ name: "MeshBeat" }],
  openGraph: {
    title: "MeshBeat - Synchronized Audio Streaming",
    description: "Turn multiple devices into a distributed speaker system",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Background effects */}
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <div className="fixed inset-0 bg-glow pointer-events-none" />
        <div className="fixed inset-0 bg-glow-bottom pointer-events-none" />

        {/* Noise texture */}
        <div className="noise" />

        {/* Main content */}
        <main className="relative min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
