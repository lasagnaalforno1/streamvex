import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StreamVex — Turn Clips into Vertical Content",
  description:
    "Convert your horizontal stream clips into TikTok, Reels, and YouTube Shorts automatically. Powered by AI cropping and FFmpeg.",
  keywords: ["streamer tools", "clip converter", "vertical video", "TikTok clips", "Shorts"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
