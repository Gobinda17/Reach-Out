import Link from "next/link";
import { prisma } from "@/lib/db";
import { productNameMap } from "@/lib/catalogue";
import { FulfillmentTable } from "@/components/admin/FulfillmentTable";

// "Needs fulfillment" = has a real address, was never claimed off blank stock
// (claimedAt null — a claimed tag is already in its owner's hands), and
// hasn't been marked shipped yet.
export default async function AdminFulfillmentPage({ searchParams }) {
  const { status: statusParam, q } = await searchParams;
  const status = statusParam === "shipped" ? "shipped" : "pending";
  const query = typeof q === "string" ? q.trim() : "";

  const names = await productNameMap();

  const searchWhere = query
    ? {
        OR: [
          { code: { contains: query.toUpperCase() } },
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { address: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const pendingWhere = { ...searchWhere, address: { not: null }, claimedAt: null, shippedAt: null };
  const shippedWhere = { ...searchWhere, shippedAt: { not: null } };

  const [pendingTags, shippedTags, pendingCount, shippedCount] = await Promise.all([
    prisma.tag.findMany({
      where: pendingWhere,
      orderBy: { createdAt: "asc" },
    }),
    prisma.tag.findMany({
      where: shippedWhere,
      orderBy: { shippedAt: "desc" },
      take: 200,
    }),
    prisma.tag.count({ where: pendingWhere }),
    prisma.tag.count({ where: shippedWhere }),
  ]);

  const rows = (status === "pending" ? pendingTags : shippedTags).map((tag) => ({
    code: tag.code,
    name: tag.name,
    phone: tag.phone,
    address: tag.address,
    product: tag.product,
    productName: names.get(tag.product) ?? tag.product,
    dateLabel: (status === "pending" ? tag.createdAt : tag.shippedAt).toLocaleDateString(),
  }));

  function statusHref(target) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (target !== "pending") params.set("status", target);
    const qs = params.toString();
    return qs ? `/admin/fulfillment?${qs}` : "/admin/fulfillment";
  }

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Fulfillment</h2>
          <p>Paid or free self-service orders waiting to be shipped, matched with their address.</p>
        </div>
        <div className="chip-row">
          <Link
            href={statusHref("pending")}
            className={`chip${status === "pending" ? " chip-active" : ""}`}
          >
            Pending ({pendingCount})
          </Link>
          <Link
            href={statusHref("shipped")}
            className={`chip${status === "shipped" ? " chip-active" : ""}`}
          >
            Shipped ({shippedCount})
          </Link>
        </div>
      </header>

      <form className="search-form">
        {status !== "pending" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search code, name, phone, or address."
          aria-label="Search fulfillment"
        />
        <button type="submit" className="pill-btn small">
          Search
        </button>
        {query && (
          <Link href={status === "pending" ? "/admin/fulfillment" : "/admin/fulfillment?status=shipped"} className="chip">
            Clear search
          </Link>
        )}
      </form>

      <FulfillmentTable
        tags={rows}
        pending={status === "pending"}
        emptyMessage={query ? "No tags match that search." : undefined}
      />
    </article>
  );
}
