import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSeller } from "@/lib/dal";
import { productNameMap } from "@/lib/catalogue";
import {
  SELLER_TAG_SELECT,
  sellerStockWhere,
  IN_STOCK,
  ACTIVATED,
  toSellerTagRow,
} from "@/lib/seller";
import { SellerTagsTable } from "@/components/seller/SellerTagsTable";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: "all", label: "All", where: {}, empty: "No tags yet — request a batch from admin." },
  {
    key: "in-stock",
    label: "In stock",
    where: IN_STOCK,
    empty: "Nothing left in stock — request more from admin.",
  },
  {
    key: "activated",
    label: "Activated",
    where: ACTIVATED,
    empty: "None of your tags have been claimed yet.",
  },
];

export default async function SellerTagsPage({ searchParams }) {
  const { q, page: pageParam, status: statusParam } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const activeTab = STATUS_TABS.find((t) => t.key === statusParam) ?? STATUS_TABS[0];
  const status = activeTab.key;

  const seller = await getSeller();

  // Code only. A seller has no name/phone to search on here because they never
  // receive those fields in the first place.
  const searchWhere = query ? { code: { contains: query.toUpperCase() } } : {};
  // sellerStockWhere is applied last so no other filter can widen the scope past
  // this seller's own rows.
  const where = sellerStockWhere(seller.id, { ...searchWhere, ...activeTab.where });

  const [counts, total, names] = await Promise.all([
    Promise.all(
      STATUS_TABS.map((tab) =>
        prisma.tag.count({ where: sellerStockWhere(seller.id, { ...searchWhere, ...tab.where }) })
      )
    ),
    prisma.tag.count({ where }),
    productNameMap(),
  ]);
  const tabCounts = Object.fromEntries(STATUS_TABS.map((tab, i) => [tab.key, counts[i]]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number(pageParam);
  const page = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: SELLER_TAG_SELECT,
  });

  const rows = tags.map((tag) => toSellerTagRow(tag, names.get(tag.product) ?? tag.product));

  function pageHref(target, targetStatus = status) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (targetStatus !== "all") params.set("status", targetStatus);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/seller/tags?${qs}` : "/seller/tags";
  }

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>My tags</h2>
          <p>
            {query
              ? `${total} match${total === 1 ? "" : "es"} for “${query}”`
              : `${total} tag${total === 1 ? "" : "s"}`}
            , newest first. Page {page} of {totalPages}. Print the QR cards and hand them out —
            whoever scans one claims it with their own details.
          </p>
        </div>
        {query && (
          <Link href="/seller/tags" className="chip">
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
        <input name="q" defaultValue={query} placeholder="Search by tag code." aria-label="Search my tags" />
        <button type="submit" className="pill-btn small">
          Search
        </button>
      </form>

      <SellerTagsTable
        tags={rows}
        emptyMessage={query ? "No tags match that search." : activeTab.empty}
      />

      {totalPages > 1 && (
        <div className="chip-row" style={{ marginTop: "0.75rem", alignItems: "center" }}>
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="pill-btn small">
              ← Prev
            </Link>
          ) : (
            <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4 }}>
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
            <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4 }}>
              Next →
            </span>
          )}
        </div>
      )}
    </article>
  );
}
