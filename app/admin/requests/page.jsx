import Link from "next/link";
import { prisma } from "@/lib/db";
import { productNameMap } from "@/lib/catalogue";
import { REQUEST_STATUS_PILL, REQUEST_STATUS_LABEL } from "@/lib/tagRequests";
import { RequestDecision } from "@/components/admin/RequestDecision";

// Same convention as the tags page: each tab owns its filter and empty copy.
const STATUS_TABS = [
  {
    key: "pending",
    label: "Pending",
    where: { status: "PENDING" },
    empty: "Nothing waiting — every request has been decided.",
  },
  {
    key: "approved",
    label: "Approved",
    where: { status: "APPROVED" },
    empty: "No approved requests yet.",
  },
  {
    key: "rejected",
    label: "Rejected",
    where: { status: "REJECTED" },
    empty: "No rejected requests.",
  },
  { key: "all", label: "All", where: {}, empty: "No sellers have requested tags yet." },
];

// The admin layout handles the ADMIN-only guard for this route.
export default async function AdminRequestsPage({ searchParams }) {
  const { q, status: statusParam } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  // Pending first — this page is a queue, and an empty queue is the goal.
  const activeTab = STATUS_TABS.find((t) => t.key === statusParam) ?? STATUS_TABS[0];

  const searchWhere = query
    ? {
        seller: {
          OR: [{ phone: { contains: query } }, { name: { contains: query, mode: "insensitive" } }],
        },
      }
    : {};

  const [requests, counts, names] = await Promise.all([
    prisma.tagRequest.findMany({
      where: { ...searchWhere, ...activeTab.where },
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { id: true, phone: true, name: true } },
        decidedBy: { select: { phone: true } },
        _count: { select: { tags: true } },
      },
    }),
    Promise.all(
      STATUS_TABS.map((tab) =>
        prisma.tagRequest.count({ where: { ...searchWhere, ...tab.where } })
      )
    ),
    productNameMap(),
  ]);

  const tabCounts = Object.fromEntries(STATUS_TABS.map((tab, i) => [tab.key, counts[i]]));
  const productName = (slug) => names.get(slug) ?? slug;

  function tabHref(key) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    // Pending is the default view, so it stays off the URL.
    if (key !== "pending") params.set("status", key);
    const qs = params.toString();
    return qs ? `/admin/requests?${qs}` : "/admin/requests";
  }

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Seller tag requests</h2>
          <p>
            Approving a request creates that many blank tags and assigns them to the seller as
            stock. Nothing is minted until you approve.
          </p>
        </div>
        {query && (
          <Link href="/admin/requests" className="chip">
            Clear search
          </Link>
        )}
      </header>

      <div className="chip-row" style={{ marginBottom: "0.75rem" }}>
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab.key)}
            className={`chip${activeTab.key === tab.key ? " chip-active" : ""}`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </Link>
        ))}
      </div>

      <form className="search-form">
        {activeTab.key !== "pending" && (
          <input type="hidden" name="status" value={activeTab.key} />
        )}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by seller phone or name."
          aria-label="Search requests"
        />
        <button type="submit" className="pill-btn small">
          Search
        </button>
      </form>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Seller</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Note</th>
              <th>Status</th>
              <th>Raised</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  {query ? "No requests match that search." : activeTab.empty}
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id}>
                  <td className="mono">
                    <Link href={`/admin/users/${req.seller.id}`} className="admin-link">
                      {req.seller.phone}
                    </Link>
                    {req.seller.name && <div className="muted">{req.seller.name}</div>}
                  </td>
                  <td>{productName(req.product)}</td>
                  <td>{req.quantity}</td>
                  <td className="muted" style={{ whiteSpace: "pre-line" }}>
                    {req.note ?? "—"}
                  </td>
                  <td>
                    <span className={REQUEST_STATUS_PILL[req.status]}>
                      {REQUEST_STATUS_LABEL[req.status]}
                    </span>
                  </td>
                  <td className="muted">{req.createdAt.toLocaleDateString()}</td>
                  <td>
                    {req.status === "PENDING" ? (
                      <RequestDecision
                        id={req.id}
                        quantity={req.quantity}
                        productName={productName(req.product)}
                      />
                    ) : (
                      <div className="muted">
                        <div>
                          {req.decidedBy?.phone ?? "—"} · {req.decidedAt?.toLocaleDateString()}
                        </div>
                        {req.status === "APPROVED" && (
                          <div>
                            {req._count.tags} tag{req._count.tags === 1 ? "" : "s"} minted
                          </div>
                        )}
                        {req.decisionNote && <div>“{req.decisionNote}”</div>}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
