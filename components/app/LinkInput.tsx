"use client";

import { useState } from "react";

const VALID_HOSTS = [
  "twitch.tv", "www.twitch.tv",
  "kick.com", "www.kick.com",
  "youtube.com", "www.youtube.com", "youtu.be",
  "clips.twitch.tv",
];

function validate(value: string): string {
  if (!value.trim()) return "Paste a link to get started";
  try {
    const u = new URL(value);
    if (!VALID_HOSTS.includes(u.hostname)) {
      return "Only Twitch, Kick, and YouTube links are supported";
    }
  } catch {
    return "That doesn't look like a valid URL";
  }
  return "";
}

export default function LinkInput() {
  const [url,   setUrl]   = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(url);
    if (err) { setError(err); return; }
    setError("");
    // TODO: platform import — coming soon
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2.5">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
          placeholder="Paste a Twitch, Kick, or YouTube link"
          className="flex-1 px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                     transition-colors duration-150"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl
                     bg-violet-600 hover:bg-violet-500 active:bg-violet-700
                     text-white font-semibold text-sm
                     shadow-lg shadow-violet-900/40 hover:shadow-violet-800/50
                     transition-all duration-150 active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
          </svg>
          Convert
        </button>
      </form>
      <p className={`text-xs mt-2.5 text-left ${error ? "text-red-400" : "text-zinc-600"}`}>
        {error || "Supports Twitch clips · Kick VODs · YouTube videos"}
      </p>
    </div>
  );
}
