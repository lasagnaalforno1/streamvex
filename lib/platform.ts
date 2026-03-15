/**
 * Platform detection and URL normalization for the paste-link import flow.
 *
 * Supported (processed via yt-dlp on Railway):
 *   - youtube      YouTube videos + Shorts
 *   - twitch_clip  Twitch clips (clips.twitch.tv or twitch.tv/…/clip/…)
 *
 * Detected but not yet supported:
 *   - twitch_vod   Twitch VODs (twitch.tv/videos/…) — too large for MVP
 *   - kick         Kick — unreliable yt-dlp coverage
 */

export type Platform =
  | "youtube"      // SUPPORTED
  | "twitch_clip"  // SUPPORTED
  | "twitch_vod"   // detected only
  | "kick";        // detected only

export type SupportStatus = "supported" | "unsupported";

export interface PlatformInfo {
  platform: Platform;
  status: SupportStatus;
  displayName: string;
  /** Canonical URL passed to yt-dlp */
  normalizedUrl: string;
  /** Shown to the user when status === "unsupported" */
  note?: string;
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
]);
const TWITCH_HOSTS = new Set([
  "twitch.tv", "www.twitch.tv", "clips.twitch.tv",
]);
const KICK_HOSTS = new Set([
  "kick.com", "www.kick.com",
]);

export function detectPlatform(rawUrl: string): PlatformInfo | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) return detectYouTube(u);
  if (TWITCH_HOSTS.has(host))  return detectTwitch(u);
  if (KICK_HOSTS.has(host)) {
    return {
      platform: "kick",
      status: "unsupported",
      displayName: "Kick",
      normalizedUrl: rawUrl,
      note: "Kick support is coming soon — paste a YouTube or Twitch clip instead.",
    };
  }

  return null;
}

function detectYouTube(u: URL): PlatformInfo | null {
  const host = u.hostname.toLowerCase();

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split(/[/?#]/)[0];
    if (!id) return null;
    return {
      platform: "youtube",
      status: "supported",
      displayName: "YouTube",
      normalizedUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  // /shorts/VIDEO_ID
  if (u.pathname.startsWith("/shorts/")) {
    const id = u.pathname.split("/")[2]?.split("?")[0];
    if (!id) return null;
    return {
      platform: "youtube",
      status: "supported",
      displayName: "YouTube Shorts",
      normalizedUrl: `https://www.youtube.com/shorts/${id}`,
    };
  }

  // /watch?v=VIDEO_ID
  const v = u.searchParams.get("v");
  if (v) {
    return {
      platform: "youtube",
      status: "supported",
      displayName: "YouTube",
      normalizedUrl: `https://www.youtube.com/watch?v=${v}`,
    };
  }

  // Channel, playlist, or other YouTube page — not a video
  return null;
}

function detectTwitch(u: URL): PlatformInfo | null {
  const host = u.hostname.toLowerCase();

  // clips.twitch.tv/SLUG
  if (host === "clips.twitch.tv") {
    const slug = u.pathname.slice(1).split("?")[0];
    if (!slug) return null;
    return {
      platform: "twitch_clip",
      status: "supported",
      displayName: "Twitch Clip",
      normalizedUrl: `https://clips.twitch.tv/${slug}`,
    };
  }

  // twitch.tv/CHANNEL/clip/SLUG
  const clipMatch = u.pathname.match(/^\/[^/]+\/clip\/([^/?#]+)/);
  if (clipMatch) {
    const cleanPath = u.pathname.split("?")[0];
    return {
      platform: "twitch_clip",
      status: "supported",
      displayName: "Twitch Clip",
      normalizedUrl: `https://www.twitch.tv${cleanPath}`,
    };
  }

  // twitch.tv/videos/ID — full VOD
  if (/^\/videos\/\d+/.test(u.pathname)) {
    return {
      platform: "twitch_vod",
      status: "unsupported",
      displayName: "Twitch VOD",
      normalizedUrl: u.href,
      note: "Twitch VODs aren't supported yet — try a Twitch clip instead.",
    };
  }

  // Channel page or unrecognised Twitch URL
  return null;
}
