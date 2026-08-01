import Link from "next/link";
import { prisma } from "@/lib/db";
import { productNameMap, listProducts } from "@/lib/catalogue";
import { BulkGenerateTagsForm } from "@/components/admin/BulkGenerateTagsForm";
import { TagsTable } from "@/components/admin/TagsTable";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "unclaimed", label: "Unclaimed" },
  { key: "claimed", label: "Claimed" },
  { key: "registered", label: "Registered" },
];

export default async function AdminTagsPage({ searchParams }) {
  const { q, page: pageParam, status: statusParam } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const status = STATUS_TABS.some((t) => t.key === statusParam) ? statusParam : "all";
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

  const statusWhere =
    status === "unclaimed"
      ? { createdById: null }
      : status === "claimed"
        ? { createdById: { not: null } }
        : status === "registered"
          ? { claimedAt: { not: null } }
          : {};

  const where = { ...searchWhere, ...statusWhere };

  const names = await productNameMap();

  const [total, unclaimedCount, claimedCount, registeredCount] = await Promise.all([
    prisma.tag.count({ where }),
    prisma.tag.count({ where: { ...searchWhere, createdById: null } }),
    prisma.tag.count({ where: { ...searchWhere, createdById: { not: null } } }),
    prisma.tag.count({ where: { ...searchWhere, claimedAt: { not: null } } }),
  ]);
  const tabCounts = {
    all: unclaimedCount + claimedCount,
    unclaimed: unclaimedCount,
    claimed: claimedCount,
    registered: registeredCount,
  };

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

  const emptyMessage = query
    ? "No tags match that search."
    : status === "unclaimed"
      ? "No unclaimed tags — everything printed so far has been claimed."
      : status === "claimed"
        ? "No claimed tags yet."
        : status === "registered"
          ? "No tags registered by scanning yet."
          : "No tags yet.";

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

        <TagsTable tags={rows} emptyMessage={emptyMessage} mode={status === "registered" ? "registered" : "default"} />

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
