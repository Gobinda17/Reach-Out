"use client";

import { useState } from "react";
import { downloadTagCard } from "@/lib/tagCard";

export function DownloadTagCardButton({ code }) {
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
    <button type="button" onClick={handleDownload} disabled={busy} className="chip">
      {busy ? "Preparing…" : "Download QR card"}
    </button>
  );
}
