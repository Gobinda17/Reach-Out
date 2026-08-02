import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSeller } from "@/lib/dal";
import { productNameMap } from "@/lib/catalogue";
import { SELLER_TAG_SELECT, sellerStockWhere, IN_STOCK, ACTIVATED } from "@/lib/seller";
import { REQUEST_STATUS_PILL, REQUEST_STATUS_LABEL } from "@/lib/tagRequests";

// The seller layout already guarantees the SALES role; getSeller() here is what
// scopes every query below to this one seller's rows.
export default async function SellerOverviewPage() {
  const seller = await getSeller();

  const [allocated, inStock, activated, openRequests, recentRequests, recentTags, names] =
    await Promise.all([
      prisma.tag.count({ where: sellerStockWhere(seller.id) }),
      prisma.tag.count({ where: sellerStockWhere(seller.id, IN_STOCK) }),
      prisma.tag.count({ where: sellerStockWhere(seller.id, ACTIVATED) }),
      prisma.tagRequest.count({ where: { sellerId: seller.id, status: "PENDING" } }),
      prisma.tagRequest.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.tag.findMany({
        where: sellerStockWhere(seller.id),
        orderBy: { createdAt: "desc" },
        take: 8,
        select: SELLER_TAG_SELECT,
      }),
      productNameMap(),
    ]);

  const productName = (slug) => names.get(slug) ?? slug;
  const activationRate = allocated === 0 ? 0 : Math.round((activated / allocated) * 100);

  const kpis = [
    {
      label: "Tags allocated",
      value: allocated,
      sub: "approved by admin, all time",
      tagText: "Total",
      tagClass: "kpi-tag neutral",
    },
    {
      label: "In stock",
      value: inStock,
      sub: "unclaimed — still yours to hand out",
      tagText: inStock === 0 ? "Empty" : "Ready",
      tagClass: inStock === 0 ? "kpi-tag warning" : "kpi-tag positive",
    },
    {
      label: "Activated",
      value: activated,
      sub: "claimed by a customer",
      tagText: `${activationRate}%`,
      tagClass: "kpi-tag positive",
    },
    {
      label: "Open requests",
      value: openRequests,
      sub: openRequests === 0 ? "nothing waiting on admin" : "waiting on admin",
      tagText: openRequests === 0 ? "Clear" : "Pending",
      tagClass: openRequests === 0 ? "kpi-tag neutral" : "kpi-tag warning",
    },
  ];

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

      <section className="main-grid">
        <article className="card">
          <header className="card-header">
            <div>
              <h2>Your latest tags</h2>
              <p>The most recent stock assigned to you.</p>
            </div>
            <Link href="/seller/tags" className="chip">
              All my tags
            </Link>
          </header>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {recentTags.length === 0 ? (
                  <tr>
                    <td className="empty-row" colSpan={4}>
                      No tags yet — request a batch from admin to get started.
                    </td>
                  </tr>
                ) : (
                  recentTags.map((tag) => (
                    <tr key={tag.code}>
                      <td className="mono">{tag.code}</td>
                      <td>{productName(tag.product)}</td>
                      <td>
                        {tag.claimedAt ? (
                          <span className="pill pill-soft pill-green">Activated</span>
                        ) : (
                          <span className="pill pill-soft pill-amber">In stock</span>
                        )}
                      </td>
                      <td className="muted">
                        {(tag.assignedAt ?? tag.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div className="side-column">
          <article className="card">
            <header className="card-header tight">
              <div>
                <h2>Recent requests</h2>
                <p>What you&apos;ve asked admin for.</p>
              </div>
              <Link href="/seller/requests" className="chip">
                Request tags
              </Link>
            </header>
            {recentRequests.length === 0 ? (
              <p className="kpi-sub">You haven&apos;t requested any tags yet.</p>
            ) : (
              <dl className="stat-list">
                {recentRequests.map((req) => (
                  <div key={req.id} className="stat-row">
                    <dt>
                      {req.quantity} × {productName(req.product)}
                    </dt>
                    <dd>
                      <span className={REQUEST_STATUS_PILL[req.status]}>
                        {REQUEST_STATUS_LABEL[req.status]}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </article>

          <article className="card">
            <header className="card-header tight">
              <div>
                <h2>How this works</h2>
                <p>From request to activation.</p>
              </div>
            </header>
            <ol className="kpi-sub" style={{ paddingLeft: "1.1rem", lineHeight: 1.7, margin: 0 }}>
              <li>Request a batch of blank tags from admin.</li>
              <li>Once approved, they appear under My tags as stock.</li>
              <li>Print the QR cards and hand them out.</li>
              <li>
                Whoever scans one claims it with their own details — you&apos;ll see it flip to
                Activated, but never their contact details.
              </li>
            </ol>
          </article>
        </div>
      </section>
    </>
  );
}
