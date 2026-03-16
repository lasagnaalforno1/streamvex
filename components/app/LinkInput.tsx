"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { detectTwitchClip } from "@/lib/platform";

export default function LinkInput() {
  const router = useRouter();
  const [url, setUrl]         = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const trimmed = url.trim();
  const clip    = trimmed ? detectTwitchClip(trimmed) : null;
  const isValid = clip !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!trimmed) { setError("Paste a Twitch clip link to get started."); return; }
    if (!isValid) { setError("That doesn't look like a Twitch clip link."); return; }

    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/import-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      router.push(`/clips/${data.clipId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2.5">
        <div className="relative flex-1">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
            placeholder="Paste a Twitch clip link"
            className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80
                       text-zinc-100 placeholder-zinc-500 text-sm
                       focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                       transition-colors duration-150"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />

          {/* Twitch badge — shown once a valid clip URL is detected */}
          {isValid && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none
                             px-2 py-0.5 rounded-full text-[10px] font-semibold border
                             bg-violet-500/15 text-violet-400 border-violet-500/25">
              Twitch
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !trimmed}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl
                     bg-violet-600 hover:bg-violet-500 active:bg-violet-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white font-semibold text-sm
                     shadow-lg shadow-violet-900/40 hover:shadow-violet-800/50
                     transition-all duration-150 active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
          )}
          {loading ? "Importing…" : "Convert"}
        </button>
      </form>

      <p className={`text-xs mt-2.5 text-left ${error ? "text-red-400" : "text-zinc-600"}`}>
        {error || "Paste a clips.twitch.tv or twitch.tv/…/clip/… link"}
      </p>
    </div>
  );
}
