"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ClipStatus, EditConfig, LayoutPreset, CropBox, ClipSegment } from "@/lib/types";
import { DEFAULT_EDIT_CONFIG } from "@/lib/types";

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_TRIM = 300; // 5 min — matches Vercel Pro maxDuration
const PW = 270;       // preview canvas width  (9:16 ratio)
const PH = 480;       // preview canvas height

// ─── save status ──────────────────────────────────────────────────────────────

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

function SaveStatusPill({ status, error }: { status: SaveStatus; error: string | null }) {
  if (status === "saved") return (
    <span className="flex items-center gap-1 text-xs text-zinc-600">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      Saved
    </span>
  );
  if (status === "saving") return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <div className="w-3 h-3 rounded-full border border-zinc-600 border-t-zinc-300 animate-spin" />
      Saving…
    </span>
  );
  if (status === "unsaved") return (
    <span className="text-xs text-amber-600/80">Unsaved</span>
  );
  if (status === "error") return (
    <span className="text-xs text-red-400" title={error ?? undefined}>Save failed</span>
  );
  return null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Sort, clamp, merge, and drop tiny segments.
 * Called before any `updateConfig({ segments })` so the saved value is always clean.
 */
function normalizeSegments(segs: ClipSegment[], dur: number): ClipSegment[] {
  return segs
    .map(s => ({ start: Math.max(0, s.start), end: Math.min(dur > 0 ? dur : s.end, s.end) }))
    .filter(s => s.end - s.start >= 0.1)
    .sort((a, b) => a.start - b.start)
    .reduce<ClipSegment[]>((acc, seg) => {
      const last = acc[acc.length - 1];
      if (last && seg.start <= last.end) {
        last.end = Math.max(last.end, seg.end);
      } else {
        acc.push({ ...seg });
      }
      return acc;
    }, []);
}

/**
 * Canonical snapshot of an EditConfig for equality comparison.
 * Keys are emitted in a fixed order so JSON.stringify is deterministic.
 * Segments are omitted when absent or empty.
 */
function configSnapshot(cfg: EditConfig, dur: number): string {
  const snap: Record<string, unknown> = {
    layout:       cfg.layout,
    gameplayCrop: cfg.gameplayCrop,
    facecamCrop:  cfg.facecamCrop,
    trimStart:    cfg.trimStart,
    trimEnd:      cfg.trimEnd ?? (dur > 0 ? dur : null),
  };
  if (cfg.segments && cfg.segments.length > 0) snap.segments = cfg.segments;
  return JSON.stringify(snap);
}

function fmt(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${sec}`;
}

// ─── canvas preview ───────────────────────────────────────────────────────────

function fillRect(
  ctx: CanvasRenderingContext2D, vid: HTMLVideoElement,
  sx: number, sy: number, sw: number, sh: number,
  dx: number, dy: number, dw: number, dh: number,
) {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
  const s = Math.max(dw / sw, dh / sh);
  ctx.drawImage(vid, sx, sy, sw, sh,
    dx + (dw - sw * s) / 2, dy + (dh - sh * s) / 2, sw * s, sh * s);
}

function renderPreview(
  canvas: HTMLCanvasElement,
  vid: HTMLVideoElement,
  cfg: EditConfig,
) {
  if (vid.readyState < 2) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const vw = vid.videoWidth, vh = vid.videoHeight;
  if (!vw || !vh) return;

  ctx.clearRect(0, 0, PW, PH);
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, PW, PH);

  const { gameplayCrop: gp, facecamCrop: fc, layout } = cfg;
  const gpSx = gp.x * vw, gpSy = gp.y * vh;
  const gpSw = gp.width * vw, gpSh = gp.height * vh;
  const fcSx = fc.x * vw, fcSy = fc.y * vh;
  const fcSw = fc.width * vw, fcSh = fc.height * vh;

  if (layout === "split") {
    const gpH = Math.round(PH * 0.6);
    const fcH = PH - gpH;
    fillRect(ctx, vid, gpSx, gpSy, gpSw, gpSh, 0, 0, PW, gpH);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, gpH, PW, 2);
    fillRect(ctx, vid, fcSx, fcSy, fcSw, fcSh, 0, gpH + 2, PW, fcH - 2);
  } else if (layout === "fullscreen_facecam_top") {
    const fcH = Math.round(PH * 0.35);
    const gpH = PH - fcH;
    fillRect(ctx, vid, fcSx, fcSy, fcSw, fcSh, 0, 0, PW, fcH);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, fcH, PW, 2);
    fillRect(ctx, vid, gpSx, gpSy, gpSw, gpSh, 0, fcH + 2, PW, gpH - 2);
  } else {
    const fcH = Math.round(PH * 0.35);
    const gpH = PH - fcH;
    fillRect(ctx, vid, gpSx, gpSy, gpSw, gpSh, 0, 0, PW, gpH);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, gpH, PW, 2);
    fillRect(ctx, vid, fcSx, fcSy, fcSw, fcSh, 0, gpH + 2, PW, fcH - 2);
  }
}

// ─── layout data ──────────────────────────────────────────────────────────────

const LAYOUTS: { id: LayoutPreset; label: string; desc: string }[] = [
  { id: "fullscreen_facecam_top",    label: "Facecam Top",    desc: "Face · Gameplay" },
  { id: "fullscreen_facecam_bottom", label: "Facecam Bottom", desc: "Gameplay · Face" },
];

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  clipId: string;
  inputUrl: string;
  outputUrl: string | null;
  status: ClipStatus;
  initialConfig: EditConfig | null;
  initialTrimStart: number | null;
  initialTrimEnd: number | null;
  initialDuration: number | null;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ClipEditor({
  clipId, inputUrl, outputUrl, status,
  initialConfig, initialTrimStart, initialTrimEnd, initialDuration,
}: Props) {
  const router = useRouter();

  // Initialise config — prefer saved edit_config, fall back to legacy trim fields
  const [config, setConfig] = useState<EditConfig>(() =>
    initialConfig ?? {
      ...DEFAULT_EDIT_CONFIG,
      trimStart: initialTrimStart ?? 0,
      trimEnd:   initialTrimEnd   ?? null,
    }
  );
  const [saveStatus,    setSaveStatus]   = useState<SaveStatus>("saved");
  const [saveError,     setSaveError]    = useState<string | null>(null);
  const [duration,      setDuration]     = useState(initialDuration ?? 0);
  const [currentTime,   setCurrentTime]  = useState(0);
  const [metaReady,     setMetaReady]    = useState(false);
  const [processing,    setProcessing]   = useState(status === "processing");
  const [processError,  setProcessError] = useState<string | null>(null);
  const [liveOutputUrl, setLiveOutputUrl] = useState<string | null>(outputUrl);
  const [showResult,    setShowResult]   = useState(!!outputUrl);
  const [downloading,   setDownloading]  = useState(false);

  const videoRef          = useRef<HTMLVideoElement>(null);
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null!);
  const railRef           = useRef<HTMLDivElement>(null);
  const previewActive     = useRef(false);
  const configRef         = useRef(config);
  const durationRef       = useRef(duration);
  const rafRef            = useRef<number>(0);
  const autoSaveTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef    = useRef(false);
  // Holds the most-current save function so debounce timers never hold stale closures
  const performSaveRef    = useRef<() => Promise<boolean>>(async () => true);
  // Snapshot of the config that is currently persisted on the server.
  // Compared (normalised) against live config to detect real changes and
  // break the setConfig → effect → save → setConfig loop.
  const savedSnapshotRef  = useRef<string>(
    configSnapshot(
      initialConfig ?? { ...DEFAULT_EDIT_CONFIG, trimStart: initialTrimStart ?? 0, trimEnd: initialTrimEnd ?? null },
      initialDuration ?? 0,
    )
  );

  // Keep refs current
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Assign latest performSave on every render
  performSaveRef.current = async function performSave(): Promise<boolean> {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const dur = durationRef.current;
      const cfg = configRef.current;
      // Build body with explicit key order (must match configSnapshot)
      const body: EditConfig = {
        layout:       cfg.layout,
        gameplayCrop: cfg.gameplayCrop,
        facecamCrop:  cfg.facecamCrop,
        trimStart:    cfg.trimStart,
        trimEnd:      cfg.trimEnd ?? (dur > 0 ? dur : null),
      };
      if (cfg.segments && cfg.segments.length > 0) body.segments = cfg.segments;
      const res = await fetch(`/api/clips/${clipId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      savedSnapshotRef.current = configSnapshot(body, dur);
      setSaveStatus("saved");
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
      setSaveStatus("error");
      return false;
    }
  };

  // Debounced auto-save — fires 800 ms after any real config change.
  // Guards: skips the first render; skips if the normalised config already
  // matches what is on the server (prevents the save→setConfig→effect loop).
  useEffect(() => {
    if (!initializedRef.current) { initializedRef.current = true; return; }
    if (configSnapshot(config, durationRef.current) === savedSnapshotRef.current) return;
    setSaveStatus("unsaved");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { performSaveRef.current(); }, 800);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [config]);

  // Canvas preview loop
  useEffect(() => {
    function loop() {
      const c = canvasRef.current, v = videoRef.current;
      if (c && v) renderPreview(c, v, configRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Sync processing flag when server refreshes the status prop
  useEffect(() => { setProcessing(status === "processing"); }, [status]);

  // Auto-show result as soon as an output URL becomes available (after polling refresh)
  useEffect(() => {
    if (outputUrl) {
      setLiveOutputUrl(outputUrl);
      setShowResult(true);
    }
  }, [outputUrl]);

  // Client-side status polling while processing
  useEffect(() => {
    if (!processing) return;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/clips/${clipId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json() as {
          status: string;
          outputUrl: string | null;
          errorMessage: string | null;
        };
        if (json.status === "ready") {
          setLiveOutputUrl(json.outputUrl);
          setProcessing(false);
          setShowResult(!!json.outputUrl);
          router.refresh();
          return;
        }
        if (json.status === "error") {
          setProcessError(json.errorMessage ?? "Processing failed.");
          setProcessing(false);
          return;
        }
      } catch {
        // network blip — keep polling
      }
      if (!cancelled) setTimeout(poll, 3000);
    }

    const t = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [processing, clipId, router]);

  // ── derived ──────────────────────────────────────────────────────────────

  const trimStart    = config.trimStart;
  const trimEnd      = config.trimEnd ?? duration;
  const trimDuration = Math.max(0, trimEnd - trimStart);

  const segs         = config.segments;
  const hasSegments  = !!(segs && segs.length > 0);
  const totalDuration = hasSegments
    ? segs!.reduce((acc, s) => acc + (s.end - s.start), 0)
    : trimDuration;

  const overLimit    = totalDuration > MAX_TRIM;
  const startPct     = duration > 0 ? (trimStart   / duration) * 100 : 0;
  const endPct       = duration > 0 ? (trimEnd     / duration) * 100 : 100;
  const playheadPct  = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canProcess   = metaReady && totalDuration > 0 && !overLimit && !processing;

  // Whether the playhead is inside a cuttable position (not within 0.1s of a boundary)
  const canSplit = hasSegments && !!(segs!.find(
    s => currentTime > s.start + 0.1 && currentTime < s.end - 0.1,
  ));

  function updateConfig(patch: Partial<EditConfig>) {
    setConfig(prev => ({ ...prev, ...patch }));
  }

  // ── segment actions ───────────────────────────────────────────────────────

  function initSegments() {
    // Convert current trim range into a single segment so the user can split from there
    updateConfig({ segments: [{ start: trimStart, end: trimEnd }] });
  }

  function splitAtPlayhead() {
    const t = videoRef.current?.currentTime ?? currentTime;
    if (!segs) return;
    const idx = segs.findIndex(s => t > s.start + 0.1 && t < s.end - 0.1);
    if (idx === -1) return;
    const seg = segs[idx];
    const newSegs = normalizeSegments(
      [...segs.slice(0, idx), { start: seg.start, end: t }, { start: t, end: seg.end }, ...segs.slice(idx + 1)],
      duration,
    );
    updateConfig({ segments: newSegs });
  }

  function removeSegment(idx: number) {
    if (!segs) return;
    const newSegs = segs.filter((_, i) => i !== idx);
    if (newSegs.length === 0) {
      updateConfig({ segments: undefined });
    } else {
      updateConfig({ segments: normalizeSegments(newSegs, duration) });
    }
  }

  function clearSegments() {
    updateConfig({ segments: undefined });
  }

  // Seek video to trimStart when the start handle is dragged, so the user
  // always sees the frame at the beginning of their selected segment.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !metaReady || previewActive.current) return;
    vid.currentTime = config.trimStart;
  }, [config.trimStart, metaReady]);

  // ── video events ─────────────────────────────────────────────────────────

  function onLoadedMetadata() {
    const vid = videoRef.current;
    if (!vid || metaReady) return;
    setDuration(vid.duration);
    setMetaReady(true);
  }

  function onTimeUpdate() {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);

    if (vid.paused) return;

    const activeSeg = configRef.current.segments;
    if (activeSeg && activeSeg.length > 0) {
      const t = vid.currentTime;
      // Are we inside any kept segment?
      const inSeg = activeSeg.some(s => t >= s.start && t < s.end);
      if (!inSeg) {
        // Find the next segment ahead of the current position
        const next = activeSeg.find(s => s.start > t);
        if (next) {
          vid.currentTime = next.start;
        } else {
          // Past all segments — pause at end of last segment
          vid.pause();
          vid.currentTime = activeSeg[activeSeg.length - 1].end;
          previewActive.current = false;
        }
      }
    } else {
      // Trim mode: enforce trimEnd
      if (vid.currentTime >= trimEnd) {
        vid.pause();
        vid.currentTime = trimEnd;
        previewActive.current = false;
      }
    }
  }

  // When play starts, if the playhead is outside the active range, snap to the start.
  function onPlay() {
    const vid = videoRef.current;
    if (!vid) return;
    const activeSeg = configRef.current.segments;
    if (activeSeg && activeSeg.length > 0) {
      const inSeg = activeSeg.some(s => vid.currentTime >= s.start && vid.currentTime < s.end);
      if (!inSeg) vid.currentTime = activeSeg[0].start;
    } else {
      if (vid.currentTime < trimStart || vid.currentTime >= trimEnd) {
        vid.currentTime = trimStart;
      }
    }
  }

  // ── trim drag ────────────────────────────────────────────────────────────

  function pointerToTime(clientX: number): number {
    if (!railRef.current || duration === 0) return 0;
    const r = railRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * duration;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const makeHandleProps = useCallback(
    (type: "start" | "end") => ({
      onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      },
      onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
        if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
        const t = pointerToTime(e.clientX);
        if (type === "start") {
          updateConfig({ trimStart: Math.max(0, Math.min(t, trimEnd - 0.1)) });
        } else {
          updateConfig({ trimEnd: Math.min(duration, Math.max(t, trimStart + 0.1)) });
        }
      },
      onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      },
    }),
    [trimStart, trimEnd, duration],
  );

  function onRailClick(e: React.MouseEvent<HTMLDivElement>) {
    if (videoRef.current) videoRef.current.currentTime = pointerToTime(e.clientX);
  }

  // ── actions ──────────────────────────────────────────────────────────────

  function previewSegment() {
    const vid = videoRef.current;
    if (!vid || !metaReady) return;
    previewActive.current = true;
    const activeSeg = config.segments;
    vid.currentTime = (activeSeg && activeSeg.length > 0) ? activeSeg[0].start : trimStart;
    vid.play().catch(() => {});
  }

  function resetTrim() {
    updateConfig({ trimStart: 0, trimEnd: null });
  }

  async function handleDownload() {
    if (!liveOutputUrl) return;
    setDownloading(true);
    try {
      const res  = await fetch(liveOutputUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `streamvex-${clipId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(liveOutputUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleProcess() {
    setSaveError(null);
    setProcessError(null);
    // Flush any pending auto-save first
    if (saveStatus !== "saved") {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      const ok = await performSaveRef.current();
      if (!ok) return;
    }
    setProcessing(true);
    try {
      const res  = await fetch(`/api/process/${clipId}`, { method: "POST" });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Processing failed.");
      router.refresh();
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "Processing failed.");
      setProcessing(false);
    }
  }

  // ── processing state ─────────────────────────────────────────────────────

  if (processing) {
    return (
      <div className="glass-card p-16 flex flex-col items-center gap-5 text-center">
        <div className="w-9 h-9 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" />
        <div>
          <p className="text-sm font-semibold text-zinc-200">Converting to 9:16…</p>
          <p className="text-xs text-zinc-500 mt-1.5">This may take a minute. Don&apos;t close this tab.</p>
        </div>
      </div>
    );
  }

  // ── result state ──────────────────────────────────────────────────────────

  if (showResult && liveOutputUrl) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">
                Converted
              </p>
              <h2 className="text-lg font-semibold text-zinc-100">Your vertical clip is ready</h2>
              <p className="text-xs text-zinc-500 mt-0.5">9:16 — optimised for TikTok, Reels &amp; Shorts</p>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0l-4.5-4.5M12 16.5l4.5-4.5" />
              </svg>
              {downloading ? "Downloading…" : "Download"}
            </button>
          </div>
          <video
            src={liveOutputUrl}
            controls
            playsInline
            className="mx-auto rounded-lg bg-zinc-950 block"
            style={{ aspectRatio: "9/16", maxHeight: 520 }}
          />
        </div>
        <div className="flex justify-center pb-2">
          <button
            onClick={() => setShowResult(false)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            Edit &amp; convert again
          </button>
        </div>
      </div>
    );
  }

  // ── editor ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* result ready banner */}
      {liveOutputUrl && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <p className="text-sm text-emerald-400 font-medium">Converted clip is ready</p>
          <button
            onClick={() => setShowResult(true)}
            className="text-xs text-emerald-300 hover:text-emerald-200 transition-colors font-medium"
          >
            View result →
          </button>
        </div>
      )}

      {/* ── layout selector ── */}
      <div className="glass-card p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Layout</p>
        <div className="flex gap-3">
          {LAYOUTS.map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => updateConfig({ layout: id })}
              className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-lg border transition-colors ${
                config.layout === id
                  ? "border-violet-500 bg-violet-500/10 text-violet-300"
                  : "border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-300"
              }`}
            >
              <LayoutIcon id={id} active={config.layout === id} />
              <div className="text-left">
                <div className="text-sm font-medium leading-tight">{label}</div>
                <div className="text-xs opacity-50 mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── source video + preview ── */}
      <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">

        {/* source video with crop overlays */}
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Source — drag boxes to set crop regions
          </p>
          <div
            ref={videoContainerRef}
            className="relative w-full"
            style={{ aspectRatio: "16/9" }}
          >
            <video
              ref={videoRef}
              src={inputUrl}
              controls
              preload="metadata"
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onPlay={onPlay}
              className="absolute inset-0 w-full h-full rounded-lg bg-zinc-950 object-contain"
            />
            {metaReady && (
              <>
                <CropOverlay
                  crop={config.gameplayCrop}
                  onChange={c => updateConfig({ gameplayCrop: c })}
                  containerRef={videoContainerRef}
                  color="#8b5cf6"
                  label="Gameplay"
                />
                <CropOverlay
                  crop={config.facecamCrop}
                  onChange={c => updateConfig({ facecamCrop: c })}
                  containerRef={videoContainerRef}
                  color="#f97316"
                  label="Facecam"
                />
              </>
            )}
          </div>
          {!metaReady && (
            <p className="text-xs text-zinc-600 text-center mt-2">
              Load the video above to enable crop selection
            </p>
          )}
        </div>

        {/* 9:16 preview canvas */}
        <div className="glass-card p-4 flex flex-col items-center">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 self-start">
            Preview (9:16)
          </p>
          <canvas
            ref={canvasRef}
            width={PW}
            height={PH}
            className="rounded-lg bg-zinc-950 block"
            style={{ width: PW, height: PH }}
          />
        </div>
      </div>

      {/* ── trim & cuts editor ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">Trim &amp; Cuts</h2>
            <SaveStatusPill status={saveStatus} error={saveError} />
          </div>
          <div className="flex items-center gap-3">
            {metaReady && (
              <span className="text-xs text-zinc-600 tabular-nums">{fmt(duration)} total</span>
            )}
            {metaReady && !hasSegments && (
              <button
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={resetTrim}
              >
                Reset trim
              </button>
            )}
            {metaReady && hasSegments && (
              <button
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={clearSegments}
              >
                Clear cuts
              </button>
            )}
          </div>
        </div>

        {!metaReady ? (
          <p className="text-sm text-zinc-600 text-center py-4">
            Load the video above to enable trimming
          </p>
        ) : (
          <div className="space-y-4">
            {/* timeline rail — segments mode shows coloured bars; trim mode shows handles */}
            <div className="relative select-none" style={{ height: 44 }}>
              <div
                ref={railRef}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-zinc-800 cursor-pointer"
                onClick={onRailClick}
              >
                {hasSegments ? (
                  /* Segment bars */
                  (segs ?? []).map((seg, i) => {
                    const sLeft  = duration > 0 ? (seg.start / duration) * 100 : 0;
                    const sWidth = duration > 0 ? ((seg.end - seg.start) / duration) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 h-full ${overLimit ? "bg-red-500/70" : "bg-violet-500/80"}`}
                        style={{ left: `${sLeft}%`, width: `${sWidth}%` }}
                      />
                    );
                  })
                ) : (
                  /* Trim-mode shading */
                  <>
                    <div
                      className="absolute top-0 h-full rounded-l-full bg-zinc-700/50"
                      style={{ width: `${startPct}%` }}
                    />
                    <div
                      className={`absolute top-0 h-full ${overLimit ? "bg-red-500/70" : "bg-violet-500/80"}`}
                      style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                    />
                    <div
                      className="absolute top-0 h-full rounded-r-full bg-zinc-700/50"
                      style={{ left: `${endPct}%`, right: 0 }}
                    />
                  </>
                )}
                {/* Playhead */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/50 pointer-events-none"
                  style={{ left: `${playheadPct}%` }}
                />
              </div>
              {!hasSegments && (
                <>
                  <TrimHandle pct={startPct} {...makeHandleProps("start")} />
                  <TrimHandle pct={endPct}   {...makeHandleProps("end")}   />
                </>
              )}
            </div>

            {/* time readout tiles */}
            {!hasSegments && (
              <div className="flex items-stretch gap-2 tabular-nums">
                <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                  <p className="text-xs text-zinc-500 mb-1">Start</p>
                  <p className="text-sm font-mono text-zinc-200">{fmt(trimStart)}</p>
                </div>
                <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Selected</p>
                  <p className={`text-sm font-mono font-semibold ${overLimit ? "text-red-400" : "text-violet-300"}`}>
                    {fmt(trimDuration)}
                  </p>
                </div>
                <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-right">
                  <p className="text-xs text-zinc-500 mb-1">End</p>
                  <p className="text-sm font-mono text-zinc-200">{fmt(trimEnd)}</p>
                </div>
              </div>
            )}

            {/* segments list */}
            {hasSegments && (
              <div className="space-y-1.5">
                {(segs ?? []).map((seg, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                  >
                    <span className="text-xs text-zinc-500 w-4 tabular-nums">{i + 1}</span>
                    <span className="text-xs font-mono text-zinc-300 flex-1 tabular-nums">
                      {fmt(seg.start)} → {fmt(seg.end)}
                      <span className="text-zinc-600 ml-2">({fmt(seg.end - seg.start)})</span>
                    </span>
                    <button
                      onClick={() => removeSegment(i)}
                      className="text-xs text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-right">
                  <span className="text-xs text-zinc-500">Total: </span>
                  <span className={`text-xs font-mono font-semibold ${overLimit ? "text-red-400" : "text-violet-300"}`}>
                    {fmt(totalDuration)}
                  </span>
                </div>
              </div>
            )}

            {/* limit warning */}
            {overLimit && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                Selection exceeds the 5-minute limit — shorten the clip.
              </div>
            )}

            {/* actions row */}
            <div className="flex items-center gap-4 pt-1">
              <button
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={previewSegment}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                Preview
              </button>

              {!hasSegments && (
                <button
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  onClick={initSegments}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  Add cuts
                </button>
              )}

              {hasSegments && (
                <button
                  disabled={!canSplit}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={splitAtPlayhead}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Split here
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── convert CTA ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-200">Convert to 9:16</p>
            {metaReady && (
              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {fmt(totalDuration)} selected{hasSegments ? ` · ${(segs ?? []).length} segment${(segs ?? []).length !== 1 ? "s" : ""}` : ""} · {LAYOUTS.find(l => l.id === config.layout)?.label}
              </p>
            )}
          </div>
          <button
            disabled={!canProcess}
            onClick={handleProcess}
            className={`shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl
                        text-sm font-semibold transition-colors
                        ${canProcess
                          ? "bg-violet-600 hover:bg-violet-500 text-white"
                          : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
            Convert to 9:16
          </button>
        </div>
        {saveError && saveStatus === "error" && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mt-4">
            Save failed: {saveError}
          </div>
        )}
        {processError && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mt-4">
            Conversion failed: {processError}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── crop overlay ─────────────────────────────────────────────────────────────

type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

interface ResizeState {
  edge: ResizeEdge;
  mx: number; my: number;
  ox: number; oy: number; ow: number; oh: number;
}

function applyResize(
  edge: ResizeEdge,
  dx: number,
  dy: number,
  orig: { ox: number; oy: number; ow: number; oh: number },
): CropBox {
  const MIN = 0.05;
  let { ox: x, oy: y, ow: w, oh: h } = orig;

  if (edge === "e" || edge === "ne" || edge === "se")
    w = Math.max(MIN, Math.min(1 - orig.ox, orig.ow + dx));
  if (edge === "w" || edge === "nw" || edge === "sw") {
    const newX = Math.max(0, Math.min(orig.ox + orig.ow - MIN, orig.ox + dx));
    w = orig.ow + orig.ox - newX; x = newX;
  }
  if (edge === "s" || edge === "se" || edge === "sw")
    h = Math.max(MIN, Math.min(1 - orig.oy, orig.oh + dy));
  if (edge === "n" || edge === "ne" || edge === "nw") {
    const newY = Math.max(0, Math.min(orig.oy + orig.oh - MIN, orig.oy + dy));
    h = orig.oh + orig.oy - newY; y = newY;
  }
  return { x, y, width: w, height: h };
}

const RESIZE_HANDLES: { edge: ResizeEdge; style: React.CSSProperties; cursor: string }[] = [
  { edge: "nw", cursor: "nwse-resize", style: { top: 0,    left:  "0%",  transform: "translate(-50%, -50%)" } },
  { edge: "n",  cursor: "ns-resize",   style: { top: 0,    left:  "50%", transform: "translate(-50%, -50%)" } },
  { edge: "ne", cursor: "nesw-resize", style: { top: 0,    right: 0,     transform: "translate(50%,  -50%)" } },
  { edge: "e",  cursor: "ew-resize",   style: { top: "50%", right: 0,    transform: "translate(50%,  -50%)" } },
  { edge: "se", cursor: "nwse-resize", style: { bottom: 0, right: 0,     transform: "translate(50%,   50%)" } },
  { edge: "s",  cursor: "ns-resize",   style: { bottom: 0, left:  "50%", transform: "translate(-50%,  50%)" } },
  { edge: "sw", cursor: "nesw-resize", style: { bottom: 0, left:  "0%",  transform: "translate(-50%,  50%)" } },
  { edge: "w",  cursor: "ew-resize",   style: { top: "50%", left: 0,     transform: "translate(-50%, -50%)" } },
];

interface CropOverlayProps {
  crop: CropBox;
  onChange: (c: CropBox) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  color: string;
  label: string;
}

function CropOverlay({ crop, onChange, containerRef, color, label }: CropOverlayProps) {
  const cropRef   = useRef(crop);
  useEffect(() => { cropRef.current = crop; }, [crop]);

  const moveRef   = useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  function containerSize() {
    const el = containerRef.current;
    if (!el) return { w: 1, h: 1 };
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  // ── move ──────────────────────────────────────────────────────────────────
  function onMoveDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveRef.current = {
      mx: e.clientX, my: e.clientY,
      cx: cropRef.current.x, cy: cropRef.current.y,
    };
  }
  function onMoveMove(e: React.PointerEvent) {
    if (!moveRef.current || !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const { w, h } = containerSize();
    const dx = (e.clientX - moveRef.current.mx) / w;
    const dy = (e.clientY - moveRef.current.my) / h;
    const c  = cropRef.current;
    onChange({
      ...c,
      x: Math.max(0, Math.min(1 - c.width,  moveRef.current.cx + dx)),
      y: Math.max(0, Math.min(1 - c.height, moveRef.current.cy + dy)),
    });
  }
  function onMoveUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    moveRef.current = null;
  }

  // ── resize (all 8 edges) ───────────────────────────────────────────────────
  function makeResizeHandlers(edge: ResizeEdge) {
    return {
      onPointerDown(e: React.PointerEvent) {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const c = cropRef.current;
        resizeRef.current = { edge, mx: e.clientX, my: e.clientY, ox: c.x, oy: c.y, ow: c.width, oh: c.height };
      },
      onPointerMove(e: React.PointerEvent) {
        if (!resizeRef.current || resizeRef.current.edge !== edge) return;
        if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
        const { w, h } = containerSize();
        const dx = (e.clientX - resizeRef.current.mx) / w;
        const dy = (e.clientY - resizeRef.current.my) / h;
        onChange(applyResize(edge, dx, dy, resizeRef.current));
      },
      onPointerUp(e: React.PointerEvent) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        resizeRef.current = null;
      },
    };
  }

  return (
    <div
      className="absolute"
      style={{
        left:      `${crop.x      * 100}%`,
        top:       `${crop.y      * 100}%`,
        width:     `${crop.width  * 100}%`,
        height:    `${crop.height * 100}%`,
        border:    `2px solid ${color}`,
        boxSizing: "border-box",
        zIndex:    10,
        pointerEvents: "none",
      }}
    >
      {/* Label */}
      <span
        className="absolute -top-5 left-0 text-xs font-semibold px-1.5 py-0.5 rounded text-white whitespace-nowrap select-none"
        style={{ background: color, pointerEvents: "none" }}
      >
        {label}
      </span>

      {/* Move handle — center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-8 h-8 rounded cursor-move touch-none
                   flex items-center justify-center"
        style={{
          pointerEvents:   "auto",
          backgroundColor: `${color}30`,
          border:          `1px solid ${color}80`,
        }}
        onPointerDown={onMoveDown}
        onPointerMove={onMoveMove}
        onPointerUp={onMoveUp}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill={color} opacity={0.9}>
          <path d="M7 0 5.5 2h3L7 0ZM7 14l1.5-2h-3L7 14ZM0 7l2 1.5V5.5L0 7ZM14 7l-2-1.5v3L14 7ZM6 6h2v2H6V6Z"/>
        </svg>
      </div>

      {/* 8 resize handles */}
      {RESIZE_HANDLES.map(({ edge, style, cursor }) => (
        <div
          key={edge}
          className="absolute w-3 h-3 rounded-sm touch-none"
          style={{
            ...style,
            pointerEvents: "auto",
            cursor,
            background: color,
            boxShadow: "0 0 0 1.5px #09090b",
          }}
          {...makeResizeHandlers(edge)}
        />
      ))}
    </div>
  );
}

// ─── layout icon ─────────────────────────────────────────────────────────────

function LayoutIcon({ id, active }: { id: LayoutPreset; active: boolean }) {
  const gp = active ? "bg-violet-400/70" : "bg-zinc-600";
  const fc = active ? "bg-orange-400/90" : "bg-zinc-500";
  const divider = "bg-zinc-950/60";

  if (id === "fullscreen_facecam_top") {
    return (
      <div className="w-7 h-12 rounded overflow-hidden flex flex-col flex-shrink-0">
        <div className={`${fc}`} style={{ flex: "35 0 0" }} />
        <div className={`h-px flex-shrink-0 ${divider}`} />
        <div className={`${gp}`} style={{ flex: "65 0 0" }} />
      </div>
    );
  }
  return (
    <div className="w-7 h-12 rounded overflow-hidden flex flex-col flex-shrink-0">
      <div className={`${gp}`} style={{ flex: "65 0 0" }} />
      <div className={`h-px flex-shrink-0 ${divider}`} />
      <div className={`${fc}`} style={{ flex: "35 0 0" }} />
    </div>
  );
}

// ─── trim handle ─────────────────────────────────────────────────────────────

interface TrimHandleProps {
  pct: number;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp:   (e: React.PointerEvent<HTMLDivElement>) => void;
}

function TrimHandle({ pct, onPointerDown, onPointerMove, onPointerUp }: TrimHandleProps) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10
                 w-3.5 h-7 rounded bg-violet-500 hover:bg-violet-400 cursor-ew-resize
                 flex items-center justify-center touch-none shadow-lg
                 transition-colors duration-100"
      style={{ left: `${pct}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="flex gap-px">
        <div className="w-px h-3 bg-white/50 rounded-full" />
        <div className="w-px h-3 bg-white/50 rounded-full" />
      </div>
    </div>
  );
}
