"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { ClipStatus, EditConfig, LayoutPreset, CropBox } from "@/lib/types";
import { DEFAULT_EDIT_CONFIG } from "@/lib/types";

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_TRIM = 300; // 5 min — matches Vercel Pro maxDuration
const PW = 270;       // preview canvas width  (9:16 ratio)
const PH = 480;       // preview canvas height

// ─── helpers ──────────────────────────────────────────────────────────────────

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

  // All three layouts use explicit zone-based rendering.
  // Zone sizes match the FFmpeg filter proportions exactly.
  if (layout === "split") {
    // Gameplay: top 60 %, Facecam: bottom 40 %
    const gpH = Math.round(PH * 0.6);
    const fcH = PH - gpH;
    fillRect(ctx, vid, gpSx, gpSy, gpSw, gpSh, 0, 0, PW, gpH);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, gpH, PW, 2);
    fillRect(ctx, vid, fcSx, fcSy, fcSw, fcSh, 0, gpH + 2, PW, fcH - 2);
  } else if (layout === "fullscreen_facecam_top") {
    // Facecam: top 35 %, Gameplay: bottom 65 %
    const fcH = Math.round(PH * 0.35);
    const gpH = PH - fcH;
    fillRect(ctx, vid, fcSx, fcSy, fcSw, fcSh, 0, 0, PW, fcH);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, fcH, PW, 2);
    fillRect(ctx, vid, gpSx, gpSy, gpSw, gpSh, 0, fcH + 2, PW, gpH - 2);
  } else {
    // fullscreen_facecam_bottom: Gameplay: top 65 %, Facecam: bottom 35 %
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
  const [configSaved,  setConfigSaved]  = useState(true);
  const [duration,     setDuration]     = useState(initialDuration ?? 0);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [metaReady,    setMetaReady]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [processing,   setProcessing]   = useState(status === "processing");
  const [processError, setProcessError] = useState<string | null>(null);
  const [showResult,   setShowResult]   = useState(!!outputUrl);

  const videoRef          = useRef<HTMLVideoElement>(null);
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null!);
  const railRef           = useRef<HTMLDivElement>(null);
  const previewActive     = useRef(false);
  const configRef         = useRef(config);
  const rafRef            = useRef<number>(0);

  // Keep configRef current without restarting the rAF loop
  useEffect(() => { configRef.current = config; }, [config]);

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
  useEffect(() => { if (outputUrl) setShowResult(true); }, [outputUrl]);

  // ── derived ──────────────────────────────────────────────────────────────

  const trimStart    = config.trimStart;
  const trimEnd      = config.trimEnd ?? duration;
  const trimDuration = Math.max(0, trimEnd - trimStart);
  const overLimit    = trimDuration > MAX_TRIM;
  const startPct     = duration > 0 ? (trimStart   / duration) * 100 : 0;
  const endPct       = duration > 0 ? (trimEnd     / duration) * 100 : 100;
  const playheadPct  = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canProcess   = metaReady && trimDuration > 0 && !overLimit && !processing;

  function updateConfig(patch: Partial<EditConfig>) {
    setConfig(prev => ({ ...prev, ...patch }));
    setConfigSaved(false);
  }

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
    if (previewActive.current && vid.currentTime >= trimEnd) {
      vid.pause();
      previewActive.current = false;
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
    vid.currentTime = trimStart;
    vid.play().catch(() => {});
  }

  async function saveConfig(): Promise<boolean> {
    setSaving(true);
    setSaveError(null);
    try {
      const body: EditConfig = {
        ...config,
        // Persist explicit trimEnd so the backend always has a value
        trimEnd: config.trimEnd ?? (duration > 0 ? duration : null),
      };
      const res = await fetch(`/api/clips/${clipId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      setConfig(body);
      setConfigSaved(true);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleProcess() {
    // Clear any stale errors from previous attempts
    setSaveError(null);
    setProcessError(null);

    if (!configSaved) {
      const ok = await saveConfig();
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

  // ── render ───────────────────────────────────────────────────────────────

  // ── processing state — shown while FFmpeg runs ────────────────────────
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

  // ── result state — shown after successful conversion ──────────────────
  if (showResult && outputUrl) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6">
          {/* header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">
                Converted
              </p>
              <h2 className="text-lg font-semibold text-zinc-100">Your vertical clip is ready</h2>
              <p className="text-xs text-zinc-500 mt-0.5">9:16 — optimised for TikTok, Reels &amp; Shorts</p>
            </div>
            <a
              href={outputUrl}
              download
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0l-4.5-4.5M12 16.5l4.5-4.5" />
              </svg>
              Download
            </a>
          </div>

          {/* preview player */}
          <video
            src={outputUrl}
            controls
            playsInline
            className="mx-auto rounded-lg bg-zinc-950 block"
            style={{ aspectRatio: "9/16", maxHeight: 520 }}
          />
        </div>

        {/* edit again */}
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

  return (
    <div className="space-y-4">

      {/* result ready banner — shown when returning to editor after conversion */}
      {outputUrl && (
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
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Layout
        </p>
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

      {/* ── trim editor ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-zinc-200">Trim</h2>
          {metaReady && (
            <span className="text-xs text-zinc-500 tabular-nums">{fmt(duration)} total</span>
          )}
        </div>

        {!metaReady ? (
          <p className="text-sm text-zinc-600 text-center py-4">
            Load the video above to enable trimming
          </p>
        ) : (
          <div className="space-y-4">
            {/* timeline rail */}
            <div className="relative select-none" style={{ height: 44 }}>
              <div
                ref={railRef}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-zinc-800 cursor-pointer"
                onClick={onRailClick}
              >
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
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/50 pointer-events-none"
                  style={{ left: `${playheadPct}%` }}
                />
              </div>
              <TrimHandle pct={startPct} {...makeHandleProps("start")} />
              <TrimHandle pct={endPct}   {...makeHandleProps("end")}   />
            </div>

            {/* time readouts */}
            <div className="flex items-center justify-between tabular-nums">
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Start</p>
                <p className="text-sm font-mono text-zinc-200">{fmt(trimStart)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-500 mb-0.5">Selected</p>
                <p className={`text-sm font-mono font-semibold ${overLimit ? "text-red-400" : "text-violet-300"}`}>
                  {fmt(trimDuration)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 mb-0.5">End</p>
                <p className="text-sm font-mono text-zinc-200">{fmt(trimEnd)}</p>
              </div>
            </div>

            {/* status messages */}
            {overLimit && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                Selection exceeds the 5-minute limit — shorten the clip.
              </div>
            )}
            {!configSaved && !overLimit && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                Unsaved changes — save before converting, or convert to save automatically.
              </div>
            )}

            {/* trim actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={previewSegment}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                Preview segment
              </button>
              {!configSaved && (
                <div className="ml-auto">
                  <Button variant="secondary" size="sm" loading={saving} onClick={() => saveConfig()}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* errors — always visible regardless of metaReady state */}
        {saveError && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mt-4">
            Save failed: {saveError}
          </div>
        )}
        {processError && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mt-4">
            Conversion failed: {processError}
          </div>
        )}

        {/* Convert — always visible so users can always find the primary action */}
        <div className="flex justify-end mt-4 pt-4 border-t border-zinc-800/60">
          <Button
            variant="primary"
            disabled={!canProcess}
            loading={processing}
            onClick={handleProcess}
          >
            {processing ? "Converting…" : "Convert to 9:16"}
          </Button>
        </div>
      </div>

    </div>
  );
}

// ─── crop overlay ─────────────────────────────────────────────────────────────

interface CropOverlayProps {
  crop: CropBox;
  onChange: (c: CropBox) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  color: string;
  label: string;
}

function CropOverlay({ crop, onChange, containerRef, color, label }: CropOverlayProps) {
  // Keep a ref so pointer handlers never have stale closures
  const cropRef   = useRef(crop);
  useEffect(() => { cropRef.current = crop; }, [crop]);

  const moveRef   = useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null);
  const resizeRef = useRef<{ mx: number; my: number; cw: number; ch: number } | null>(null);

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

  // ── resize (bottom-right handle) ─────────────────────────────────────────
  function onResizeDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = {
      mx: e.clientX, my: e.clientY,
      cw: cropRef.current.width, ch: cropRef.current.height,
    };
  }
  function onResizeMove(e: React.PointerEvent) {
    if (!resizeRef.current || !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const { w, h } = containerSize();
    const dx = (e.clientX - resizeRef.current.mx) / w;
    const dy = (e.clientY - resizeRef.current.my) / h;
    const c  = cropRef.current;
    onChange({
      ...c,
      width:  Math.max(0.1, Math.min(1 - c.x, resizeRef.current.cw + dx)),
      height: Math.max(0.1, Math.min(1 - c.y, resizeRef.current.ch + dy)),
    });
  }
  function onResizeUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    resizeRef.current = null;
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
        // Interior is transparent to pointer events so the video controls work normally.
        pointerEvents: "none",
      }}
    >
      {/* Label — non-interactive */}
      <span
        className="absolute -top-5 left-0 text-xs font-semibold px-1.5 py-0.5 rounded text-white whitespace-nowrap select-none"
        style={{ background: color, pointerEvents: "none" }}
      >
        {label}
      </span>

      {/* Move handle — centered, the only interactive drag zone */}
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
        {/* four-dot move icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill={color} opacity={0.9}>
          <path d="M7 0 5.5 2h3L7 0ZM7 14l1.5-2h-3L7 14ZM0 7l2 1.5V5.5L0 7ZM14 7l-2-1.5v3L14 7ZM6 6h2v2H6V6Z"/>
        </svg>
      </div>

      {/* Resize handle — bottom-right corner */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize touch-none"
        style={{ pointerEvents: "auto", background: color }}
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
      />
    </div>
  );
}

// ─── layout icon ─────────────────────────────────────────────────────────────

function LayoutIcon({ id, active }: { id: LayoutPreset; active: boolean }) {
  const gp = active ? "bg-violet-400/70" : "bg-zinc-600";
  const fc = active ? "bg-orange-400/90" : "bg-zinc-500";
  const divider = "bg-zinc-950/60";

  // Thumbnails use accurate zone proportions matching the actual FFmpeg output.
  // fullscreen_facecam_top:    top 35 % facecam (orange) · bottom 65 % gameplay (violet)
  // fullscreen_facecam_bottom: top 65 % gameplay (violet) · bottom 35 % facecam (orange)
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
