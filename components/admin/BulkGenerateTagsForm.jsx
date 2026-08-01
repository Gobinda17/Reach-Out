"use client";

import { useActionState, useState } from "react";
import { bulkGenerateTags } from "@/app/admin/actions";
import { downloadTagCard, downloadTagCardsZip } from "@/lib/tagCard";

const monoStyle = { fontFamily: "var(--font-mono), ui-monospace, monospace" };

export function BulkGenerateTagsForm({ products }) {
  const [state, formAction, pending] = useActionState(bulkGenerateTags, null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Every card at full print quality, one .zip — not N separate downloads
  // and not a single downscaled grid image.
  async function downloadAll(codes) {
    setDownloadingAll(true);
    try {
      await downloadTagCardsZip(codes, `tags-${codes.length}.zip`);
    } finally {
      setDownloadingAll(false);
    }
  }

  return (
    <form action={formAction}>
      <div className="form-grid">
        <label className="field">
          <span>Quantity *</span>
          <input name="count" type="number" min={1} max={200} defaultValue={10} required />
        </label>

        <label className="field">
          <span>Product *</span>
          <select name="product" className="select-control" style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem" }}>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={pending || products.length === 0} className="pill-btn">
          {pending ? "Generating…" : "Generate tags"}
        </button>
        {state?.ok && <span className="form-success">{state.message}</span>}
        {state?.error && <span className="form-error">{state.error}</span>}
      </div>

      {products.length === 0 && (
        <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
          No active products — add one before generating tags.
        </p>
      )}

      {state?.ok && state.codes?.length > 0 && (
        <>
          <div className="chip-row" style={{ marginTop: "0.6rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => downloadAll(state.codes)}
              disabled={downloadingAll}
              className="pill-btn small"
            >
              {downloadingAll ? "Zipping…" : "Download all as ZIP"}
            </button>
          </div>
          <div className="chip-row" style={{ marginTop: "0.5rem" }}>
            {state.codes.map((code) => (
              <span key={code} className="chip-row" style={{ gap: "0.15rem" }}>
                <a href={`/admin/tags/${code}`} className="chip" style={monoStyle}>
                  {code}
                </a>
                <button
                  type="button"
                  onClick={() => downloadTagCard(code)}
                  className="chip"
                  title={`Download QR card for ${code}`}
                  aria-label={`Download QR card for ${code}`}
                >
                  ⬇
                </button>
              </span>
            ))}
          </div>
        </>
      )}
    </form>
  );
}
