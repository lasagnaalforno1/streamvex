import { createClient } from "@/lib/supabase/server";
import ClipCard from "@/components/dashboard/ClipCard";
import UploadForm from "@/components/dashboard/UploadForm";
import type { Clip } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: clips } = await supabase
    .from("clips")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const typedClips = (clips ?? []) as Clip[];

  // Generate signed preview URLs in parallel (prefer output for ready clips, fallback to input)
  const previewUrls = await Promise.all(
    typedClips.map(async (clip) => {
      const path = clip.output_path ?? clip.input_path;
      if (!path) return null;
      const { data } = await supabase.storage.from("clips").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    })
  );

  const stats = {
    total:      typedClips.length,
    ready:      typedClips.filter((c) => c.status === "ready").length,
    processing: typedClips.filter((c) => c.status === "processing" || c.status === "uploading").length,
    error:      typedClips.filter((c) => c.status === "error").length,
  };

  return (
    <div className="space-y-8">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 px-6 py-8 sm:px-10 shadow-lg">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 rounded-full bg-violet-600/[0.12] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-fuchsia-700/[0.08] blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">
              Studio
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Your Clips
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-sm leading-relaxed">
              Upload a horizontal recording and convert it to vertical 9:16 — ready for TikTok, Reels &amp; Shorts.
            </p>
          </div>
          <div className="flex-shrink-0">
            <UploadForm />
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      {typedClips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* Total */}
          <div className="rounded-xl border border-white/[0.07] bg-zinc-900/70 px-5 py-4 transition-colors hover:border-white/[0.12]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total</span>
              <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{stats.total}</p>
          </div>

          {/* Ready */}
          <div className="rounded-xl border border-white/[0.07] bg-zinc-900/70 px-5 py-4 transition-colors hover:border-emerald-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Ready</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.ready}</p>
          </div>

          {/* Processing */}
          <div className="rounded-xl border border-white/[0.07] bg-zinc-900/70 px-5 py-4 transition-colors hover:border-amber-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Processing</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{stats.processing}</p>
          </div>

          {/* Error */}
          <div className="rounded-xl border border-white/[0.07] bg-zinc-900/70 px-5 py-4 transition-colors hover:border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Errors</span>
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-400 tabular-nums">{stats.error}</p>
          </div>

        </div>
      )}

      {/* ── Clip grid ─────────────────────────────────────────────────────── */}
      {typedClips.length === 0 ? (

        <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-950/10 to-transparent" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 flex items-center justify-center mb-5 mx-auto">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-200 mb-2">No clips yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
              Upload your first horizontal clip to convert it to 9:16 vertical format.
            </p>
          </div>
        </div>

      ) : (
        <>
          <div className="flex items-center justify-between -mb-2">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
              {typedClips.length} {typedClips.length === 1 ? "clip" : "clips"}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {typedClips.map((clip, i) => (
              <ClipCard key={clip.id} clip={clip} previewUrl={previewUrls[i]} />
            ))}
          </div>
        </>
      )}

    </div>
  );
}
