"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  clipId: string;
  initialTitle: string;
}

export default function ClipActions({ clipId, initialTitle }: Props) {
  const router = useRouter();

  // ── rename state ──────────────────────────────────────────────────────────
  const [title,       setTitle]       = useState(initialTitle);
  const [editing,     setEditing]     = useState(false);
  const [draft,       setDraft]       = useState(initialTitle);
  const [saving,      setSaving]      = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // ── delete state ──────────────────────────────────────────────────────────
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // ── rename ────────────────────────────────────────────────────────────────
  async function handleRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) { setEditing(false); return; }

    setSaving(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/clips/${clipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json();
        setRenameError(j.error ?? "Failed to rename");
        return;
      }
      setTitle(trimmed);
      setEditing(false);
      router.refresh();
    } catch {
      setRenameError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  function cancelRename() {
    setEditing(false);
    setDraft(title);
    setRenameError(null);
  }

  // ── delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/clips/${clipId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        setDeleteError(j.error ?? "Failed to delete");
        setDeleting(false);
        return;
      }
      router.push("/app");
    } catch {
      setDeleteError("Network error — try again");
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">

      {/* ── Title / inline rename ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  handleRename();
                if (e.key === "Escape") cancelRename();
              }}
              className="input-field text-lg font-bold py-1 px-2 w-72"
              maxLength={200}
            />
            <button
              onClick={handleRename}
              disabled={saving}
              className="btn-primary text-xs px-3 py-1.5 shrink-0"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelRename}
              className="btn-secondary text-xs px-3 py-1.5 shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group/title">
            <h1 className="text-xl font-bold text-zinc-50 break-all">{title}</h1>
            <button
              onClick={() => { setDraft(title); setEditing(true); }}
              className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
              aria-label="Rename clip"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
          </div>
        )}
        {renameError && (
          <p className="text-xs text-red-400 mt-1">{renameError}</p>
        )}
      </div>

      {/* ── Delete ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 text-right">
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-xs px-3 py-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 transition-colors"
          >
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs text-zinc-500">Delete this clip?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setDeleteError(null); }}
              disabled={deleting}
              className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {deleteError && (
          <p className="text-xs text-red-400 mt-1">{deleteError}</p>
        )}
      </div>

    </div>
  );
}
