"use client";

import { useMemo, useState } from "react";
import { downloadTagCard, downloadTagCardsZip } from "@/lib/tagCard";

// The seller's view of their own stock. Unlike the admin table this shows no
// customer details at all — a tag that's been claimed says "Activated" and
// nothing more (see SELLER_TAG_SELECT in lib/seller.js). Rows arrive
// pre-formatted from the server component, so no Prisma types cross the
// boundary.
export function SellerTagsTable({ tags, emptyMessage }) {
  const [selected, setSelected] = useState(() => new Set());
  const [downloading, setDownloading] = useState(false);

  const selectedCodes = useMemo(() => [...selected], [selected]);
  const allSelected = tags.length > 0 && selected.size === tags.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(tags.map((t) => t.code)));
  }

  function toggleOne(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadTagCardsZip(selectedCodes, `my-tags-${selectedCodes.length}.zip`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {tags.length > 0 && (
        <div className="chip-row" style={{ marginBottom: "0.6rem", alignItems: "center" }}>
          <button
            type="button"
            className="pill-btn small"
            disabled={selected.size === 0 || downloading}
            onClick={handleDownload}
          >
            {downloading ? "Zipping…" : `Download cards as ZIP (${selected.size})`}
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={tags.length === 0}
                  aria-label="Select all"
                />
              </th>
              <th>Code</th>
              <th>Product</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Activated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.code}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(tag.code)}
                      onChange={() => toggleOne(tag.code)}
                      aria-label={`Select ${tag.code}`}
                    />
                  </td>
                  <td className="mono">{tag.code}</td>
                  <td>{tag.productName}</td>
                  <td>
                    {tag.activated ? (
                      <span className="pill pill-soft pill-green">Activated</span>
                    ) : (
                      <span className="pill pill-soft pill-amber">In stock</span>
                    )}
                  </td>
                  <td className="muted">{tag.assignedLabel}</td>
                  <td className="muted">{tag.activatedLabel ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => downloadTagCard(tag.code)}
                      className="pill-btn pill-btn-ghost small"
                      title={`Download QR card for ${tag.code}`}
                    >
                      Card
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
