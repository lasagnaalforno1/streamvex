"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ClipStatus } from "@/lib/types";

interface Props {
  status: ClipStatus;
  /** Polling interval in ms. Defaults to 2 500. */
  intervalMs?: number;
}

/**
 * Invisible component that polls router.refresh() while the clip is in a
 * transient state (uploading = import in progress, processing = FFmpeg running).
 * Stops automatically once status becomes "ready" or "error".
 * Drop it anywhere on the clip page — it renders nothing.
 */
export default function ClipStatusPoller({ status, intervalMs = 2500 }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "uploading" && status !== "processing") return;

    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [status, intervalMs, router]);

  return null;
}
