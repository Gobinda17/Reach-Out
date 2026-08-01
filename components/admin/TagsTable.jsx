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
// mode="registered" is for tags whose name/phone/address only exist because
// someone scanned and claimed them (the Registered tab): the bulk download
// includes an addresses.csv alongside the cards, and — since these are the
// ones admin still needs to physically process — marks them downloaded
// afterward so the tab can show what's already been pulled.
export function TagsTable({ tags, emptyMessage, mode = "default" }) {
  const router = useRouter();
  const registered = mode === "registered";
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
      if (registered) {
        await downloadTagCardsZipWithAddresses(selectedTags, `tags-${selectedCodes.length}.zip`);
        startTransition(async () => {
          await markTagsDownloaded(selectedCodes);
          router.refresh();
        });
      } else {
        await downloadTagCardsZip(selectedCodes, `tags-${selectedCodes.length}.zip`);
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
              : registered
                ? `Download ZIP with addresses (${selected.size})`
                : `Download as ZIP (${selected.size})`}
          </button>
          {registered && isPending && <span className="kpi-sub">Marking downloaded…</span>}
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
              {registered ? <th>Address</th> : <th>Created by</th>}
              <th>Created</th>
              {registered && <th>Downloaded</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={registered ? 10 : 9}>
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
                  {registered ? (
                    <td className="muted" style={{ whiteSpace: "pre-line" }}>
                      {tag.address}
                    </td>
                  ) : (
                    <td className="mono muted">{tag.createdByPhone}</td>
                  )}
                  <td className="muted">{tag.dateLabel}</td>
                  {registered && (
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
