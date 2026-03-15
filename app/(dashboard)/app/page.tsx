import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClipCard from "@/components/dashboard/ClipCard";
import UploadForm from "@/components/dashboard/UploadForm";
import LinkInput from "@/components/app/LinkInput";
import type { Clip } from "@/lib/types";

export default async function AppHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clips } = await supabase
    .from("clips")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(4);

  const recentClips = (clips ?? []) as Clip[];

  const previewUrls = await Promise.all(
    recentClips.map(async (clip) => {
      const path = clip.output_path ?? clip.input_path;
      if (!path) return null;
      const { data } = await supabase.storage.from("clips").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    })
  );

  return (
    <div className="space-y-10">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 px-6 py-14 sm:px-12 text-center">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-violet-600/[0.09] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-purple-700/[0.05] blur-3xl" />

        <div className="relative">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">
            StreamVex Studio
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            Turn your clips into{" "}
            <span className="gradient-text">vertical gold</span>
          </h1>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed mb-8">
            Paste a stream link or upload a file — get a 9:16 vertical clip
            ready for TikTok, Reels &amp; Shorts in seconds.
          </p>

          {/* Paste link */}
          <LinkInput />

          {/* Divider */}
          <div className="flex items-center gap-4 my-6 max-w-md mx-auto">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 shrink-0">or upload a local file</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Upload */}
          <div className="flex justify-center">
            <UploadForm />
          </div>
        </div>
      </div>

      {/* ── Recent clips ──────────────────────────────────────────────────── */}
      {recentClips.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Recent clips</h2>
            <Link
              href="/dashboard"
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentClips.map((clip, i) => (
              <ClipCard key={clip.id} clip={clip} previewUrl={previewUrls[i]} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-300 mb-1">No clips yet</p>
          <p className="text-xs text-zinc-500">Upload your first clip above to get started.</p>
        </div>
      )}

    </div>
  );
}
