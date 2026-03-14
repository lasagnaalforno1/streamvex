import Link from "next/link";
import type { Clip } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatBytes, formatDate } from "@/lib/utils";

export default function ClipCard({ clip }: { clip: Clip }) {
  return (
    <Link
      href={`/clips/${clip.id}`}
      className="glass-card p-5 flex flex-col gap-3 hover:border-zinc-700/60 hover:bg-zinc-900/80 transition-all duration-150 group"
    >
      {/* Thumbnail placeholder */}
      <div className="w-full aspect-video rounded-lg bg-zinc-950 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-transparent" />
        <svg
          className="w-10 h-10 text-zinc-700 group-hover:text-zinc-600 transition-colors"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
          />
        </svg>
        {/* Vertical icon overlay */}
        {clip.status === "ready" && (
          <div className="absolute right-2 top-2">
            <div className="w-5 h-9 rounded bg-violet-600/80 border border-violet-500/50 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-medium text-zinc-200 text-sm truncate group-hover:text-zinc-100">
            {clip.title}
          </p>
          <StatusBadge status={clip.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-600">
          {clip.file_size && <span>{formatBytes(clip.file_size)}</span>}
          {clip.duration && <span>{Math.round(clip.duration)}s</span>}
          <span>{formatDate(clip.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
