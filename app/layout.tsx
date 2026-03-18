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
      <head>
        {/* Inline script: apply stored theme before React hydrates to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('sv-theme');var r=document.documentElement;if(t==='Light'){r.classList.add('light');}else if(t==='System'&&window.matchMedia('(prefers-color-scheme:light)').matches){r.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
