"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { formatBytes } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setFile(null);
    setTitle("");
    setError(null);
    setProgress(0);
    setUploading(false);
  }

  function handleFileChange(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileChange(dropped);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    let clipId: string | null = null;

    try {
      // Step 1: Init — create DB record, get back the storage path (tiny JSON request, no file data)
      const initRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || file.name,
          fileSize: file.size,
          originalFilename: file.name,
          mimeType: file.type,
        }),
      });

      const initJson = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initJson.error ?? "Failed to initialise upload.");
      }

      clipId = initJson.clipId as string;
      const inputPath = initJson.inputPath as string;

      // Step 2: Upload directly to Supabase Storage — bypasses Next.js/Vercel body limits entirely
      const supabase = createClient();

      // Simulate progress while the XHR upload runs (storage-js doesn't expose progress events)
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 4, 90));
      }, 400);

      const { error: storageError } = await supabase.storage
        .from("clips")
        .upload(inputPath, file, {
          contentType: file.type,
          upsert: false,
        });

      clearInterval(interval);

      if (storageError) {
        console.error("[upload] storage error:", storageError);
        // Best-effort cleanup of the orphaned DB record
        await supabase.from("clips").delete().eq("id", clipId);
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      setProgress(100);

      // Step 3: Mark the clip as ready
      const completeRes = await fetch(`/api/upload/${clipId}/complete`, { method: "POST" });
      if (!completeRes.ok) {
        const completeJson = await completeRes.json().catch(() => ({})) as { error?: string };
        throw new Error(completeJson.error ?? "Failed to finalise upload.");
      }

      setOpen(false);
      reset();
      router.push(`/clips/${clipId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        Upload clip
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-zinc-50">Upload a clip</h2>
          <button
            onClick={() => { setOpen(false); reset(); }}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-violet-500 bg-violet-500/10"
                : file
                ? "border-violet-700/50 bg-violet-500/5"
                : "border-zinc-700 hover:border-zinc-600"
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
              className="sr-only"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-violet-400 truncate">{file.name}</p>
                <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-zinc-400 font-medium">
                  Drop a video here, or <span className="text-violet-400">browse</span>
                </p>
                <p className="text-xs text-zinc-600 mt-1">MP4, MOV, AVI, WEBM — up to 50 MB</p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="label">Clip title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome clip"
              className="input-field"
            />
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setOpen(false); reset(); }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={!file || uploading}
              loading={uploading}
            >
              Upload
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
