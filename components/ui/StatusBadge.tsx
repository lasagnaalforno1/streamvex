import { cn } from "@/lib/utils";
import type { ClipStatus } from "@/lib/types";

const STATUS_CONFIG: Record<ClipStatus, { label: string; className: string }> = {
  uploading: {
    label: "Uploading",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/35 shadow-sm shadow-blue-900/30",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-500/20 text-amber-300 border-amber-500/35 shadow-sm shadow-amber-900/30",
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/35 shadow-sm shadow-emerald-900/30",
  },
  error: {
    label: "Error",
    className: "bg-red-500/20 text-red-300 border-red-500/35 shadow-sm shadow-red-900/30",
  },
};

export default function StatusBadge({ status }: { status: ClipStatus }) {
  const config = STATUS_CONFIG[status];
  const isActive = status === "processing" || status === "uploading";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-sm",
        config.className
      )}
    >
      {/* Animated ping for in-progress states */}
      {isActive && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}

      {/* Static dot for ready */}
      {status === "ready" && (
        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      )}

      {/* X for error */}
      {status === "error" && (
        <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}

      {config.label}
    </span>
  );
}
