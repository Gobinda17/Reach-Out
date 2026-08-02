"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteTag, markTagsDownloaded } from "@/app/admin/actions";
import { downloadTagCardsZip, downloadTagCardsZipWithAddresses } from "@/lib/tagCard";

// `tags` are plain pre-formatted rows from the server component (dates and
// product names already resolved), so this stays a client component without
// needing to serialize Prisma rows across the boundary.
//
// Two things vary by mode, and they aren't the same thing:
//
// - mode="registered" (tags someone scanned and claimed) is the only mode whose
//   export needs an addresses.csv beside the cards, since it's the only one with
//   an owner to post to.
// - "registered" and "unclaimed" are both export queues, so both show a
//   Downloaded column and mark rows downloaded once a ZIP is actually pulled.
//   ("all" mixes the two, so it stays a plain list.)
export function TagsTable({ tags, emptyMessage, mode = "default" }) {
  const router = useRouter();
  const withAddresses = mode === "registered";
  const tracksDownload = mode === "registered" || mode === "unclaimed";
  const [selected, setSelected] = useState(() => new Set());
  const [downloading, setDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedCodes = useMemo(() => [...selected], [selected]);
  const selectedTags = useMemo(() => tags.filter((t) => selected.has(t.code)), [tags, selected]);
  const allSelected = tags.length > 0 && selected.size === tags.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(tags.map((t) => t.code)));
  }

  function toggleOne(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const filename = `tags-${selectedCodes.length}.zip`;
      if (withAddresses) {
        await downloadTagCardsZipWithAddresses(selectedTags, filename);
      } else {
        await downloadTagCardsZip(selectedCodes, filename);
      }
      // Only after the ZIP actually resolved — a failed export shouldn't leave
      // rows marked as pulled.
      if (tracksDownload) {
        startTransition(async () => {
          await markTagsDownloaded(selectedCodes);
          router.refresh();
        });
      }
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
            {downloading
              ? "Zipping…"
              : withAddresses
                ? `Download ZIP with addresses (${selected.size})`
                : `Download as ZIP (${selected.size})`}
          </button>
          {tracksDownload && isPending && <span className="kpi-sub">Marking downloaded…</span>}
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
              <th>Name</th>
              <th>Phone</th>
              {withAddresses ? <th>Address</th> : <th>Created by</th>}
              <th>Created</th>
              {tracksDownload && <th>Downloaded</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={tracksDownload ? 10 : 9}>
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
                  <td className="mono">
                    <Link href={`/admin/tags/${tag.code}`} className="admin-link">
                      {tag.code}
                    </Link>
                  </td>
                  <td>{tag.productName}</td>
                  <td>
                    {tag.claimed ? (
                      <span className="pill pill-soft pill-green">Claimed</span>
                    ) : (
                      <span className="pill pill-soft pill-amber">Unclaimed</span>
                    )}
                  </td>
                  <td>{tag.name}</td>
                  <td className="mono muted">{tag.phone}</td>
                  {withAddresses ? (
                    <td className="muted" style={{ whiteSpace: "pre-line" }}>
                      {tag.address}
                    </td>
                  ) : (
                    <td className="mono muted">{tag.createdByPhone}</td>
                  )}
                  <td className="muted">{tag.dateLabel}</td>
                  {tracksDownload && (
                    <td>
                      {tag.downloaded ? (
                        <span className="pill pill-soft pill-green" title={tag.downloadedLabel}>
                          Downloaded
                        </span>
                      ) : (
                        <span className="pill pill-soft pill-amber">Not yet</span>
                      )}
                    </td>
                  )}
                  <td>
                    <DeleteButton
                      action={deleteTag}
                      fields={{ code: tag.code }}
                      confirmText={`Delete tag ${tag.code}? Anyone scanning it will get "not found".`}
                    />
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
