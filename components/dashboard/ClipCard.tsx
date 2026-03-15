"use client";

import Link from "next/link";
import { useState } from "react";
import type { Clip } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatBytes, formatDate } from "@/lib/utils";

/**
 * Derives a unique dark gradient from the clip UUID.
 * Every clip gets a distinct hue pair — deterministic, no random, no Tailwind purge risk.
 */
function clipGradient(id: string): string {
  const hex = id.replace(/-/g, "");
  const hue  = parseInt(hex.slice(0, 3), 16) % 360;
  const hue2 = (hue + 65) % 360;
  return `linear-gradient(145deg, hsl(${hue} 50% 10%) 0%, hsl(${hue2} 40% 7%) 100%)`;
}

interface Props {
  clip: Clip;
  previewUrl?: string | null;
}

export default function ClipCard({ clip, previewUrl }: Props) {
  const isProcessing = clip.status === "processing" || clip.status === "uploading";
  const isReady      = clip.status === "ready";
  const isError      = clip.status === "error";
  const [downloading, setDownloading] = useState(false);

  const meta: string[] = [];
  if (clip.file_size) meta.push(formatBytes(clip.file_size));
  if (clip.duration)  meta.push(`${Math.round(clip.duration)}s`);
  meta.push(formatDate(clip.created_at));

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!previewUrl || downloading) return;
    setDownloading(true);
    try {
      const res  = await fetch(previewUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `${clip.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(previewUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Link
      href={`/clips/${clip.id}`}
      className="group flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden
                 transition-all duration-200
                 hover:border-violet-500/40 hover:bg-zinc-900 hover:-translate-y-0.5
                 hover:shadow-xl hover:shadow-violet-950/20"
    >
      {/* ── Thumbnail ──────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/9", background: clipGradient(clip.id) }}
      >
        {/* Video preview */}
        {previewUrl && (
          <video
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            preload="metadata"
            playsInline
            onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
          />
        )}

        {/* Processing pulse overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-pulse" />
        )}

        {/* Error tint */}
        {isError && (
          <div className="absolute inset-0 bg-red-950/30" />
        )}

        {/* Hover overlay — dark gradient from bottom, fades in */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
            isReady
              ? "bg-violet-600/80 border border-violet-400/40 shadow-lg shadow-violet-900/60 group-hover:scale-110 group-hover:bg-violet-500/90"
              : "bg-zinc-950/60 border border-zinc-700/40"
          }`}>
            {isProcessing ? (
              <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-amber-400 animate-spin" />
            ) : isError ? (
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg
                className={`w-4 h-4 translate-x-0.5 ${isReady ? "text-white" : "text-zinc-500 group-hover:text-zinc-400"}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
            )}
          </div>
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={clip.status} />
        </div>

        {/* 9:16 ready chip — bottom left */}
        {isReady && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-zinc-950/80 border border-emerald-500/25 rounded-md px-1.5 py-0.5 backdrop-blur-sm">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              9:16
            </span>
          </div>
        )}

        {/* Hover actions — bottom right, slide up on hover */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5
                        opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                        transition-all duration-200">
          {isReady && previewUrl && (
            <button
              onClick={handleDownload}
              title="Download"
              className="w-7 h-7 rounded-lg bg-zinc-900/90 border border-zinc-700/60 backdrop-blur-sm
                         flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800
                         transition-colors"
            >
              {downloading ? (
                <div className="w-3 h-3 rounded-full border border-zinc-600 border-t-white animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-300
                           bg-zinc-900/90 border border-zinc-700/60 backdrop-blur-sm
                           rounded-lg px-2 py-1">
            Open
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>

      {/* ── Info ──────────────────────────────────────────────────────────── */}
      <div className="px-3.5 py-3 flex flex-col gap-1">
        <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate leading-snug">
          {clip.title}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-600 truncate">
            {meta.join(" · ")}
          </p>
          {isProcessing && (
            <span className="text-[10px] text-amber-500/80 shrink-0">Converting…</span>
          )}
          {isError && (
            <span className="text-[10px] text-red-500/80 shrink-0">Failed</span>
          )}
        </div>
      </div>
    </Link>
  );
}
