import Link from "next/link";
import { prisma } from "@/lib/db";
import { productNameMap, listProducts } from "@/lib/catalogue";
import { BulkGenerateTagsForm } from "@/components/admin/BulkGenerateTagsForm";
import { TagsTable } from "@/components/admin/TagsTable";

const PAGE_SIZE = 25;

// Each tab carries its own filter and empty-state copy, so the tab list, the
// count queries and the active filter can't drift apart as tabs are added.
const STATUS_TABS = [
  { key: "all", label: "All", where: {}, empty: "No tags yet." },
  {
    key: "unclaimed",
    label: "Unclaimed",
    where: { createdById: null },
    empty: "No unclaimed tags — everything printed so far has been claimed.",
  },
  {
    key: "claimed",
    label: "Claimed",
    where: { createdById: { not: null } },
    empty: "No claimed tags yet.",
  },
  {
    key: "registered",
    label: "Registered",
    where: { claimedAt: { not: null } },
    empty: "No tags registered by scanning yet.",
  },
];

export default async function AdminTagsPage({ searchParams }) {
  const { q, page: pageParam, status: statusParam } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const activeTab = STATUS_TABS.find((t) => t.key === statusParam) ?? STATUS_TABS[0];
  const status = activeTab.key;
  const products = await listProducts();

  const searchWhere = query
    ? {
        OR: [
          { code: { contains: query.toUpperCase() } },
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { vehicleReg: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const where = { ...searchWhere, ...activeTab.where };

  const names = await productNameMap();

  // Every tab's count respects the current search term, so the numbers describe
  // the result set the user is actually looking at.
  const counts = await Promise.all(
    STATUS_TABS.map((tab) => prisma.tag.count({ where: { ...searchWhere, ...tab.where } }))
  );
  const tabCounts = Object.fromEntries(STATUS_TABS.map((tab, i) => [tab.key, counts[i]]));
  const total = tabCounts[status];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number(pageParam);
  const page = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { createdBy: { select: { phone: true } } },
  });

  // Keeps the current search term and status tab attached when flipping
  // pages, and drops page=1/status=all/empty q from the URL so links stay clean.
  function pageHref(target, targetStatus = status) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (targetStatus !== "all") params.set("status", targetStatus);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/admin/tags?${qs}` : "/admin/tags";
  }

  const rows = tags.map((tag) => ({
    code: tag.code,
    productName: names.get(tag.product) ?? tag.product,
    claimed: Boolean(tag.createdById),
    name: tag.name,
    phone: tag.phone,
    address: tag.address,
    createdByPhone: tag.createdBy?.phone ?? "—",
    dateLabel: tag.createdAt.toLocaleDateString(),
    downloaded: Boolean(tag.downloadedAt),
    downloadedLabel: tag.downloadedAt ? tag.downloadedAt.toLocaleString() : null,
  }));

  const emptyMessage = query ? "No tags match that search." : activeTab.empty;

  // Both of these tabs are export queues — blank stock waiting to be printed,
  // and scan-claimed tags waiting to be posted — so both track which rows have
  // already been pulled. Only "registered" needs addresses in the export.
  const tableMode =
    status === "registered" ? "registered" : status === "unclaimed" ? "unclaimed" : "default";

  return (
    <>
      <article className="card">
        <header className="card-header">
          <div>
            <h2>Generate tags</h2>
            <p>
              Print a batch of blank tags with no owner yet — whoever scans one first can claim
              it and it becomes theirs.
            </p>
          </div>
        </header>
        <BulkGenerateTagsForm products={products} />
      </article>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Tags</h2>
            <p>
              {query
                ? `${total} match${total === 1 ? "" : "es"} for “${query}”`
                : `${total} tag${total === 1 ? "" : "s"}`}
              , newest first. Page {page} of {totalPages}.
            </p>
          </div>
          {query && (
            <Link href="/admin/tags" className="chip">
              Clear search
            </Link>
          )}
        </header>

        <div className="chip-row" style={{ marginBottom: "0.75rem" }}>
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={pageHref(1, tab.key)}
              className={`chip${status === tab.key ? " chip-active" : ""}`}
            >
              {tab.label} ({tabCounts[tab.key]})
            </Link>
          ))}
        </div>

        <form className="search-form">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={query}
            placeholder="Search code, name, phone, or vehicle reg."
            aria-label="Search tags"
          />
          <button type="submit" className="pill-btn small">
            Search
          </button>
        </form>

        <TagsTable tags={rows} emptyMessage={emptyMessage} mode={tableMode} />

        {totalPages > 1 && (
          <div className="chip-row" style={{ marginTop: "0.75rem", alignItems: "center" }}>
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="pill-btn small">
                ← Prev
              </Link>
            ) : (
              <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4, cursor: "not-allowed" }}>
                ← Prev
              </span>
            )}
            <span className="kpi-sub">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="pill-btn small">
                Next →
              </Link>
            ) : (
              <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4, cursor: "not-allowed" }}>
                Next →
              </span>
            )}
          </div>
        )}
      </article>
    </>
  );
}
