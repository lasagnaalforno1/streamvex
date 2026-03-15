import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClipCard from "@/components/dashboard/ClipCard";
import UploadForm from "@/components/dashboard/UploadForm";
import LinkInput from "@/components/app/LinkInput";
import type { Clip } from "@/lib/types";

const STEPS = [
  {
    n: "1",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: "Paste a link",
    desc: "Drop a Twitch, Kick, or YouTube URL",
  },
  {
    n: "2",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "Convert to vertical",
    desc: "9:16 crop with layout preview",
  },
  {
    n: "3",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: "Download & post",
    desc: "TikTok · Reels · YouTube Shorts",
  },
];

export default async function AppHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clips } = await supabase
    .from("clips")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(6);

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
            Paste a stream link or upload a local file — get a 9:16 vertical
            clip ready for TikTok, Reels &amp; Shorts.
          </p>

          {/* Link input */}
          <LinkInput />

          {/* Divider */}
          <div className="flex items-center gap-4 my-6 max-w-xl mx-auto">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 shrink-0">or upload a local file</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Upload CTA */}
          <div className="flex justify-center">
            <UploadForm />
          </div>
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className="relative flex flex-col items-center text-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-5 sm:px-6"
          >
            {/* Connector line (between steps) */}
            {i < STEPS.length - 1 && (
              <div className="absolute top-[2.1rem] -right-3 sm:-right-4 w-6 sm:w-8 h-px bg-zinc-800 z-10 hidden sm:block" />
            )}
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              {step.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-300 mb-0.5">{step.title}</p>
              <p className="text-[11px] text-zinc-600 leading-relaxed hidden sm:block">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent clips ──────────────────────────────────────────────────── */}
      {recentClips.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-zinc-300">Recent clips</h2>
              <span className="text-xs text-zinc-700 tabular-nums">{recentClips.length}</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              View all
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentClips.map((clip, i) => (
              <ClipCard key={clip.id} clip={clip} previewUrl={previewUrls[i]} />
            ))}
          </div>
        </div>
      ) : (
        /* ── Empty state ─────────────────────────────────────────────────── */
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-950/[0.06] to-transparent" />
          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-600/10 border border-violet-500/20 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-200 mb-1.5">No clips yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-5">
              Paste a stream link above or upload a local video to create your first 9:16 clip.
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <svg className="w-3.5 h-3.5 text-violet-500/60" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              Supports MP4, MOV, AVI, WEBM up to 50 MB
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
