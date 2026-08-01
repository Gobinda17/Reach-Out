import Link from "next/link";
import { prisma } from "@/lib/db";
import { productNameMap } from "@/lib/catalogue";
import { FulfillmentTable } from "@/components/admin/FulfillmentTable";

// "Needs fulfillment" = has a real address, was never claimed off blank stock
// (claimedAt null — a claimed tag is already in its owner's hands), and
// hasn't been marked shipped yet.
export default async function AdminFulfillmentPage({ searchParams }) {
  const { status: statusParam } = await searchParams;
  const status = statusParam === "shipped" ? "shipped" : "pending";

  const names = await productNameMap();

  const [pendingTags, shippedTags, pendingCount, shippedCount] = await Promise.all([
    prisma.tag.findMany({
      where: { address: { not: null }, claimedAt: null, shippedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tag.findMany({
      where: { shippedAt: { not: null } },
      orderBy: { shippedAt: "desc" },
      take: 200,
    }),
    prisma.tag.count({ where: { address: { not: null }, claimedAt: null, shippedAt: null } }),
    prisma.tag.count({ where: { shippedAt: { not: null } } }),
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

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Fulfillment</h2>
          <p>Paid or free self-service orders waiting to be shipped, matched with their address.</p>
        </div>
        <div className="chip-row">
          <Link
            href="/admin/fulfillment"
            className={`chip${status === "pending" ? " chip-active" : ""}`}
          >
            Pending ({pendingCount})
          </Link>
          <Link
            href="/admin/fulfillment?status=shipped"
            className={`chip${status === "shipped" ? " chip-active" : ""}`}
          >
            Shipped ({shippedCount})
          </Link>
        </div>
      </header>

      <FulfillmentTable tags={rows} pending={status === "pending"} />
    </article>
  );
}
