"use client";

import { useState } from "react";
import { downloadTagCard } from "@/lib/tagCard";

// Re-composes the same printable tag card shown right after generation, so a
// tag's owner can grab a fresh copy any time without keeping the original.
export function DownloadTagButton({ code }) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      await downloadTagCard(code);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      title="Download tag card"
      aria-label="Download tag card"
      className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {busy ? "Preparing…" : "Download"}
    </button>
  );
}
