/**
 * Twitch clip URL detection and normalization.
 *
 * Accepted formats:
 *   - https://clips.twitch.tv/SLUG
 *   - https://www.twitch.tv/CHANNEL/clip/SLUG
 *
 * Both are normalized to clips.twitch.tv/SLUG for consistency.
 */

export interface TwitchClipInfo {
  /** Canonical URL passed to yt-dlp */
  normalizedUrl: string;
  /** The clip slug extracted from the URL */
  slug: string;
}

const TWITCH_HOSTS = new Set(["twitch.tv", "www.twitch.tv", "clips.twitch.tv"]);

export function detectTwitchClip(rawUrl: string): TwitchClipInfo | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase();
  if (!TWITCH_HOSTS.has(host)) return null;

  // clips.twitch.tv/SLUG
  if (host === "clips.twitch.tv") {
    const slug = u.pathname.slice(1).split(/[?#]/)[0];
    if (!slug) return null;
    return { normalizedUrl: `https://clips.twitch.tv/${slug}`, slug };
  }

  // www.twitch.tv/CHANNEL/clip/SLUG
  const match = u.pathname.match(/^\/[^/]+\/clip\/([^/?#]+)/);
  if (match) {
    const slug = match[1];
    return { normalizedUrl: `https://clips.twitch.tv/${slug}`, slug };
  }

  return null;
}
