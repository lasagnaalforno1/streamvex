"use client";

import { useState } from "react";

// ─── types ────────────────────────────────────────────────────────────────────

export type ExportPreset = "standard" | "high" | "ultra";

interface PresetDef {
  id: ExportPreset;
  title: string;
  subtitle: string;
  desc: string;
}

const PRESETS: PresetDef[] = [
  {
    id: "standard",
    title: "Standard",
    subtitle: "720p · 30 fps",
    desc: "Fast export, works great on all platforms.",
  },
  {
    id: "high",
    title: "High Quality",
    subtitle: "1080p · 30 fps",
    desc: "Full HD — better detail for close-up gameplay.",
  },
  {
    id: "ultra",
    title: "Ultra Smooth",
    subtitle: "1080p · 60 fps",
    desc: "Buttery smooth motion for fast-paced content.",
  },
];

// ─── availability helpers ─────────────────────────────────────────────────────

export interface ExportEntitlements {
  isPro: boolean;
  isCreator: boolean;
  sourceHighFpsEligible: boolean;
}

/**
 * Returns whether the user can select this preset.
 * - standard: always
 * - high: requires Pro or Creator
 * - ultra: requires Pro or Creator AND a high-fps source
 */
export function presetEnabled(id: ExportPreset, e: ExportEntitlements): boolean {
  const hasAccess = e.isPro || e.isCreator;
  if (id === "standard") return true;
  if (!hasAccess) return false;
  if (id === "ultra") return e.sourceHighFpsEligible;
  return true; // high
}

function presetLocked(id: ExportPreset, e: ExportEntitlements): boolean {
  return id !== "standard" && !(e.isPro || e.isCreator);
}

function disabledReason(id: ExportPreset, e: ExportEntitlements): string | null {
  if (id === "ultra" && (e.isPro || e.isCreator) && !e.sourceHighFpsEligible) {
    return "Source must be 50+ fps to unlock 60 fps export";
  }
  return null;
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props extends ExportEntitlements {
  onConfirm: (preset: ExportPreset) => void;
  onClose: () => void;
}

export default function ExportModal({
  isPro,
  isCreator,
  sourceHighFpsEligible,
  onConfirm,
  onClose,
}: Props) {
  const entitlements: ExportEntitlements = { isPro, isCreator, sourceHighFpsEligible };
  const hasAccess = isPro || isCreator;

  const [selected, setSelected] = useState<ExportPreset>(() =>
    hasAccess ? "high" : "standard",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-sm shadow-2xl shadow-violet-950/60 border-zinc-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Export Quality</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Choose the quality for your 9:16 export
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preset cards */}
        <div className="px-5 pb-3 space-y-2">
          {PRESETS.map((preset) => {
            const enabled  = presetEnabled(preset.id, entitlements);
            const locked   = presetLocked(preset.id, entitlements);
            const reason   = disabledReason(preset.id, entitlements);
            const isActive = selected === preset.id;

            return (
              <button
                key={preset.id}
                disabled={!enabled}
                onClick={() => enabled && setSelected(preset.id)}
                className={[
                  "w-full flex items-start gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-150",
                  isActive
                    ? "border-violet-500/70 bg-violet-500/10"
                    : enabled
                    ? "border-zinc-700/60 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-800/30"
                    : "border-zinc-800/40 bg-zinc-900/20 opacity-55 cursor-not-allowed",
                ].join(" ")}
              >
                {/* Radio dot */}
                <div
                  className={[
                    "mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                    isActive ? "border-violet-500 bg-violet-500" : "border-zinc-600",
                  ].join(" ")}
                >
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${isActive ? "text-violet-200" : enabled ? "text-zinc-200" : "text-zinc-500"}`}>
                      {preset.title}
                    </span>
                    <span className={`text-[10px] font-medium tabular-nums ${isActive ? "text-violet-400" : "text-zinc-500"}`}>
                      {preset.subtitle}
                    </span>

                    {preset.id === "standard" && !locked && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Free
                      </span>
                    )}
                    {locked && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 leading-snug ${isActive ? "text-zinc-400" : "text-zinc-600"}`}>
                    {reason ?? preset.desc}
                  </p>
                </div>

                {/* Lock icon */}
                {locked && (
                  <svg className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Upsell nudge for free users */}
        {!hasAccess && (
          <div className="mx-5 mb-3 rounded-lg bg-violet-500/8 border border-violet-500/15 px-3 py-2.5">
            <p className="text-xs text-zinc-400">
              Unlock 1080p exports and remove the watermark with{" "}
              <a
                href="/signup?plan=pro"
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                StreamVex Pro →
              </a>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700/60 text-sm text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
