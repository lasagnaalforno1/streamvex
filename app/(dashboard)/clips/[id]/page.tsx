import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import ClipStatusPoller from "@/components/dashboard/ClipStatusPoller";
import ClipEditor from "@/components/dashboard/ClipEditor";
import ClipActions from "@/components/dashboard/ClipActions";
import type { Clip, EditConfig } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClipPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: clip } = await supabase
    .from("clips")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!clip) notFound();

  const typedClip = clip as Clip;

  // Signed URLs expire in 1 hour — sufficient for an editing session
  let inputUrl: string | null = null;
  let outputUrl: string | null = null;

  if (typedClip.input_path) {
    const { data } = await supabase.storage
      .from("clips")
      .createSignedUrl(typedClip.input_path, 3600);
    inputUrl = data?.signedUrl ?? null;
  }

  if (typedClip.output_path) {
    const { data } = await supabase.storage
      .from("clips")
      .createSignedUrl(typedClip.output_path, 3600);
    outputUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Polls router.refresh() every 2.5 s while uploading/processing — renders nothing */}
      <ClipStatusPoller status={typedClip.status} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/app" className="hover:text-zinc-300 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-300 truncate max-w-xs">{typedClip.title}</span>
      </nav>

      {/* Header: inline rename + delete */}
      <div className="space-y-1.5">
        <ClipActions clipId={typedClip.id} initialTitle={typedClip.title} />
        <div className="flex items-center gap-3">
          <StatusBadge status={typedClip.status} />
          <p className="text-zinc-500 text-sm">Uploaded {formatDate(typedClip.created_at)}</p>
        </div>
      </div>

      {/* Transient-state banner — shown while import or FFmpeg is running */}
      {(typedClip.status === "uploading" || typedClip.status === "processing") && (
        <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-4 py-3 flex items-center gap-3 text-sm text-zinc-400">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 border-t-violet-400 animate-spin shrink-0" />
          {typedClip.status === "uploading" ? "Importing clip…" : "Processing clip…"}
          <span className="ml-auto text-xs text-zinc-600">Page updates automatically</span>
        </div>
      )}

      {/* Error banner */}
      {typedClip.status === "error" && typedClip.error_message && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <span className="font-medium">Processing failed: </span>
          {typedClip.error_message}
        </div>
      )}

      {/* Editor — layout selector, crop overlays, preview canvas, trim + convert */}
      {inputUrl ? (
        <ClipEditor
          clipId={typedClip.id}
          inputUrl={inputUrl}
          outputUrl={outputUrl}
          status={typedClip.status}
          initialConfig={typedClip.edit_config as EditConfig | null}
          initialTrimStart={typedClip.trim_start_seconds}
          initialTrimEnd={typedClip.trim_end_seconds}
          initialDuration={typedClip.duration}
        />
      ) : (
        <div className="glass-card p-8 flex items-center justify-center text-zinc-600 text-sm">
          Video file not available.
        </div>
      )}

      {/* Metadata — compact footer row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 pt-2 border-t border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-600">Status</span>
          <StatusBadge status={typedClip.status} />
        </div>
        {typedClip.file_size && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-600">Size</span>
            <span className="text-xs text-zinc-500">{formatBytes(typedClip.file_size)}</span>
          </div>
        )}
        {typedClip.duration && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-600">Duration</span>
            <span className="text-xs text-zinc-500">{Math.round(typedClip.duration)}s</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-600">Uploaded</span>
          <span className="text-xs text-zinc-500">{formatDate(typedClip.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
