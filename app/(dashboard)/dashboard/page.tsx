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

  const stats = {
    total: typedClips.length,
    ready: typedClips.filter((c) => c.status === "ready").length,
    processing: typedClips.filter(
      (c) => c.status === "processing" || c.status === "uploading"
    ).length,
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Your Clips</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Upload a clip and convert it to vertical format.
          </p>
        </div>
        <UploadForm />
      </div>

      {/* Stats row */}
      {typedClips.length > 0 && (
        <div className="grid grid-cols-3 gap-4 max-w-sm">
          <div className="glass-card px-4 py-3">
            <p className="text-xs text-zinc-500 mb-0.5">Total</p>
            <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
          </div>
          <div className="glass-card px-4 py-3">
            <p className="text-xs text-zinc-500 mb-0.5">Ready</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.ready}</p>
          </div>
          <div className="glass-card px-4 py-3">
            <p className="text-xs text-zinc-500 mb-0.5">Processing</p>
            <p className="text-2xl font-bold text-amber-400">{stats.processing}</p>
          </div>
        </div>
      )}

      {/* Clips list */}
      {typedClips.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-violet-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <h3 className="text-zinc-200 font-semibold mb-1">No clips yet</h3>
          <p className="text-zinc-500 text-sm max-w-xs">
            Upload your first horizontal clip to convert it to 9:16 vertical format.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {typedClips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </div>
  );
}
