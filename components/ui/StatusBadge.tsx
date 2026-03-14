import { cn } from "@/lib/utils";
import type { ClipStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  ClipStatus,
  { label: string; className: string }
> = {
  uploading: {
    label: "Uploading",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  error: {
    label: "Error",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

export default function StatusBadge({ status }: { status: ClipStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className
      )}
    >
      {(status === "processing" || status === "uploading") && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {status === "ready" && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {config.label}
    </span>
  );
}
