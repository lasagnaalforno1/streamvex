"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { ClipStatus } from "@/lib/types";

interface Props {
  clipId: string;
  status: ClipStatus;
}

export default function ProcessButton({ clipId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "processing") {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-400">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Processing…
      </div>
    );
  }

  async function handleProcess() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/process/${clipId}`, { method: "POST" });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Processing failed");

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start processing");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="primary"
        loading={loading}
        onClick={handleProcess}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
          />
        </svg>
        Convert to 9:16
      </Button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
