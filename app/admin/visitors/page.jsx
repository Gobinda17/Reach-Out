import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSuperAdmin } from "@/lib/dal";
import { productNameMap } from "@/lib/catalogue";
import {
  VISITOR_SCAN_SELECT,
  VISITOR_MESSAGE_SELECT,
  VISITOR_CALL_SELECT,
  toScanRow,
  toMessageRow,
  toCallRow,
  sinceDays,
} from "@/lib/visitors";

const PAGE_SIZE = 50;

const TABS = [
  { key: "scans", label: "Scans" },
  { key: "messages", label: "Messages" },
  { key: "calls", label: "Calls" },
];

// Super-admin only, same shape as the activity log: /admin is reachable by any
// admin, so the page makes the check itself and the nav merely hides the link.
export default async function AdminVisitorsPage({ searchParams }) {
  const superAdmin = await getSuperAdmin();
  if (!superAdmin) redirect("/admin");

  const { q, page: pageParam, tab: tabParam } = await searchParams;
  const query = typeof q === "string" ? q.trim().toUpperCase() : "";
  const activeTab = TABS.find((t) => t.key === tabParam) ?? TABS[0];

  // Every tab filters on the same thing — which tag was visited — so one clause
  // covers all three models.
  const searchWhere = query ? { tag: { code: { contains: query } } } : {};
  const week = sinceDays(7);

  const [
    scanTotal,
    scanWeek,
    signedInTotal,
    messageTotal,
    callTotal,
    tagsScanned,
    topTags,
    names,
  ] = await Promise.all([
    prisma.scan.count({ where: searchWhere }),
    prisma.scan.count({ where: { ...searchWhere, createdAt: { gte: week } } }),
    prisma.scan.count({ where: { ...searchWhere, scannedById: { not: null } } }),
    prisma.scanMessage.count({ where: searchWhere }),
    prisma.call.count({ where: searchWhere }),
    prisma.scan.groupBy({ by: ["tagId"], where: searchWhere, _count: { _all: true } }),
    prisma.scan.groupBy({
      by: ["tagId"],
      where: searchWhere,
      _count: { _all: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 6,
    }),
    productNameMap(),
  ]);

  const productName = (slug) => names.get(slug) ?? slug;

  // groupBy gives tag ids; resolve them to codes in one round trip.
  const topTagRows = await prisma.tag.findMany({
    where: { id: { in: topTags.map((t) => t.tagId) } },
    select: { id: true, code: true },
  });
  const codeById = new Map(topTagRows.map((t) => [t.id, t.code]));

  const totals = { scans: scanTotal, messages: messageTotal, calls: callTotal };
  const total = totals[activeTab.key];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number(pageParam);
  const page = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const paging = {
    where: searchWhere,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  };

  let rows = [];
  if (activeTab.key === "scans") {
    const found = await prisma.scan.findMany({ ...paging, select: VISITOR_SCAN_SELECT });
    rows = found.map((r) => toScanRow(r, productName(r.tag?.product)));
  } else if (activeTab.key === "messages") {
    const found = await prisma.scanMessage.findMany({ ...paging, select: VISITOR_MESSAGE_SELECT });
    rows = found.map((r) => toMessageRow(r, productName(r.tag?.product)));
  } else {
    const found = await prisma.call.findMany({ ...paging, select: VISITOR_CALL_SELECT });
    rows = found.map((r) => toCallRow(r, productName(r.tag?.product)));
  }

  const anonShare = scanTotal === 0 ? 0 : Math.round(((scanTotal - signedInTotal) / scanTotal) * 100);
  const contactRate = scanTotal === 0 ? 0 : Math.round(((messageTotal + callTotal) / scanTotal) * 100);

  const kpis = [
    {
      label: "Scans",
      value: scanTotal,
      sub: `${scanWeek} in the last 7 days`,
      tagText: "All time",
      tagClass: "kpi-tag neutral",
    },
    {
      label: "Tags visited",
      value: tagsScanned.length,
      sub: "distinct tags scanned at least once",
      tagText: "Reach",
      tagClass: "kpi-tag neutral",
    },
    {
      label: "Anonymous",
      value: `${anonShare}%`,
      sub: `${scanTotal - signedInTotal} of ${scanTotal} scans not signed in`,
      tagText: "Privacy",
      tagClass: "kpi-tag positive",
    },
    {
      label: "Contact attempts",
      value: messageTotal + callTotal,
      sub: `${messageTotal} message${messageTotal === 1 ? "" : "s"} · ${callTotal} call${
        callTotal === 1 ? "" : "s"
      }`,
      tagText: `${contactRate}% of scans`,
      tagClass: "kpi-tag neutral",
    },
  ];

  function href(target, targetTab = activeTab.key) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (targetTab !== "scans") params.set("tab", targetTab);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/admin/visitors?${qs}` : "/admin/visitors";
  }

  return (
    <>
      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="card kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">{kpi.label}</span>
              <span className={kpi.tagClass}>{kpi.tagText}</span>
            </div>
            <div className="kpi-main">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-sub">{kpi.sub}</span>
            </div>
            <div className="kpi-sparkline" />
          </article>
        ))}
      </section>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Visitors</h2>
            <p>
              Everyone who has scanned a tag. Volume and behaviour only — a visitor&apos;s identity
              is never shown here, and neither is the content of what they sent, even to a super
              admin.
            </p>
          </div>
          {query && (
            <Link href="/admin/visitors" className="chip">
              Clear search
            </Link>
          )}
        </header>

        <div className="chip-row" style={{ marginBottom: "0.75rem" }}>
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={href(1, tab.key)}
              className={`chip${activeTab.key === tab.key ? " chip-active" : ""}`}
            >
              {tab.label} ({totals[tab.key]})
            </Link>
          ))}
        </div>

        <form className="search-form">
          {activeTab.key !== "scans" && <input type="hidden" name="tab" value={activeTab.key} />}
          <input
            name="q"
            defaultValue={query}
            placeholder="Filter by tag code."
            aria-label="Filter visitors by tag code"
          />
          <button type="submit" className="pill-btn small">
            Search
          </button>
        </form>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Tag</th>
                <th>Product</th>
                {activeTab.key === "scans" && <th>Visitor</th>}
                {activeTab.key === "messages" && <th>Sender contact</th>}
                {activeTab.key === "calls" && (
                  <>
                    <th>Provider</th>
                    <th>Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={5}>
                    {query
                      ? "Nothing recorded for that tag code."
                      : `No ${activeTab.label.toLowerCase()} recorded yet.`}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {row.when}
                    </td>
                    <td className="mono">
                      <Link href={`/admin/tags/${row.code}`} className="admin-link">
                        {row.code}
                      </Link>
                    </td>
                    <td>{row.productName}</td>
                    {activeTab.key === "scans" && (
                      <td>
                        {row.signedIn ? (
                          <span className="pill pill-soft">Signed in</span>
                        ) : (
                          <span className="pill pill-soft pill-green">Anonymous</span>
                        )}
                      </td>
                    )}
                    {activeTab.key === "messages" && (
                      <td>
                        {row.sharedContact ? (
                          <span className="pill pill-soft pill-amber">Shared</span>
                        ) : (
                          <span className="pill pill-soft pill-green">Withheld</span>
                        )}
                      </td>
                    )}
                    {activeTab.key === "calls" && (
                      <>
                        <td>{row.provider}</td>
                        <td>
                          <span className="pill pill-soft">{row.status}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="chip-row" style={{ marginTop: "0.75rem", alignItems: "center" }}>
            {page > 1 ? (
              <Link href={href(page - 1)} className="pill-btn small">
                ← Newer
              </Link>
            ) : (
              <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4 }}>
                ← Newer
              </span>
            )}
            <span className="kpi-sub">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={href(page + 1)} className="pill-btn small">
                Older →
              </Link>
            ) : (
              <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4 }}>
                Older →
              </span>
            )}
          </div>
        )}
      </article>

      <article className="card">
        <header className="card-header tight">
          <div>
            <h2>Most visited tags</h2>
            <p>Where the scans are actually coming from.</p>
          </div>
        </header>
        {topTags.length === 0 ? (
          <p className="kpi-sub">No scans recorded yet.</p>
        ) : (
          <dl className="stat-list">
            {topTags.map((row) => (
              <div key={row.tagId} className="stat-row">
                <dt className="mono">
                  <Link href={`/admin/tags/${codeById.get(row.tagId)}`} className="admin-link">
                    {codeById.get(row.tagId) ?? `#${row.tagId}`}
                  </Link>
                </dt>
                <dd>
                  {row._count._all} scan{row._count._all === 1 ? "" : "s"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </article>
    </>
  );
}
