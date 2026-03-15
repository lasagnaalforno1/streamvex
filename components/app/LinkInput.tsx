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
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
          placeholder="https://www.twitch.tv/clips/..."
          className="input-field flex-1"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn-primary whitespace-nowrap">
          Convert
        </button>
      </form>
      <p className={`text-xs mt-2 text-left ${error ? "text-red-400" : "text-zinc-600"}`}>
        {error || "Twitch · Kick · YouTube supported"}
      </p>
    </div>
  );
}
