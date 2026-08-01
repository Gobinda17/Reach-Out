"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markTagsShipped } from "@/app/admin/actions";
import { downloadFulfillmentSheet, downloadFulfillmentCsv } from "@/lib/adminSheets";
import { downloadTagCardsZip } from "@/lib/tagCard";

// `tags` are plain objects (dates pre-formatted by the server component) so
// this stays a client component without needing to serialize Prisma rows.
export function FulfillmentTable({ tags, pending, emptyMessage }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [isPending, startTransition] = useTransition();

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

  async function handleDownloadSheet() {
    setBusy("sheet");
    setMessage(null);
    try {
      await downloadFulfillmentSheet(selectedTags);
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadCards() {
    setBusy("cards");
    setMessage(null);
    try {
      const codes = selectedTags.map((t) => t.code);
      await downloadTagCardsZip(codes, `tags-${codes.length}.zip`);
    } finally {
      setBusy(null);
    }
  }

  function handleDownloadCsv() {
    downloadFulfillmentCsv(selectedTags);
  }

  function handleMarkShipped() {
    setBusy("ship");
    setMessage(null);
    startTransition(async () => {
      const result = await markTagsShipped([...selected]);
      setMessage(result);
      setBusy(null);
      if (result.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <>
      {pending && (
        <div className="chip-row" style={{ marginBottom: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="pill-btn small"
            disabled={selected.size === 0 || busy !== null}
            onClick={handleDownloadSheet}
          >
            {busy === "sheet" ? "Preparing…" : `Download shipping sheet (${selected.size})`}
          </button>
          <button
            type="button"
            className="pill-btn small"
            disabled={selected.size === 0 || busy !== null}
            onClick={handleDownloadCards}
          >
            {busy === "cards" ? "Zipping…" : `Download tag cards ZIP (${selected.size})`}
          </button>
          <button
            type="button"
            className="pill-btn small"
            disabled={selected.size === 0}
            onClick={handleDownloadCsv}
          >
            Download CSV ({selected.size})
          </button>
          <button
            type="button"
            className="pill-btn small"
            disabled={selected.size === 0 || busy !== null || isPending}
            onClick={handleMarkShipped}
          >
            {busy === "ship" ? "Saving…" : `Mark as shipped (${selected.size})`}
          </button>
          {message?.ok && <span className="form-success">{message.message}</span>}
          {message?.error && <span className="form-error">{message.error}</span>}
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {pending && (
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              <th>Code</th>
              <th>Product</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>{pending ? "Ordered" : "Shipped"}</th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={pending ? 7 : 6}>
                  {emptyMessage ?? (pending ? "Nothing waiting on fulfillment." : "Nothing shipped yet.")}
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.code}>
                  {pending && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(tag.code)}
                        onChange={() => toggleOne(tag.code)}
                        aria-label={`Select ${tag.code}`}
                      />
                    </td>
                  )}
                  <td className="mono">
                    <Link href={`/admin/tags/${tag.code}`} className="admin-link">
                      {tag.code}
                    </Link>
                  </td>
                  <td>{tag.productName}</td>
                  <td>{tag.name}</td>
                  <td className="mono muted">{tag.phone}</td>
                  <td className="muted" style={{ whiteSpace: "pre-line" }}>
                    {tag.address}
                  </td>
                  <td className="muted">{tag.dateLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
