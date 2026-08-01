"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20";

export function NameEditForm({ currentName }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function startEditing() {
    setName(currentName ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not save your name.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{currentName || "—"}</p>
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400"
        >
          {currentName ? "Change" : "Add"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
        <input
          type="text"
          maxLength={100}
          autoFocus
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </label>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-black px-4 py-2 text-xs font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 disabled:translate-y-0 disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
