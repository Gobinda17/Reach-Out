import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatAmount } from "@/lib/products";
import { productNameMap } from "@/lib/catalogue";
import { TagEditForm } from "@/components/admin/TagEditForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteTag } from "../../actions";

export default async function AdminTagDetailPage({ params }) {
  const { code } = await params;

  const tag = await prisma.tag.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      createdBy: { select: { phone: true, role: true } },
      order: true,
    },
  });

  if (!tag) notFound();

  const names = await productNameMap();

  const facts = [
    ["Product", names.get(tag.product) ?? tag.product],
    ["Created by", tag.createdBy?.phone ?? "—"],
    ["Created", tag.createdAt.toLocaleString()],
    ["Last updated", tag.updatedAt.toLocaleString()],
    [
      "Order",
      tag.order
        ? `${formatAmount(tag.order.amountPaise)} · ${tag.order.status} · ${tag.order.razorpayOrderId}`
        : "— (no payment record)",
    ],
  ];

  return (
    <>
      <article className="card">
        <header className="card-header">
          <div>
            <h2 className="mono">{tag.code}</h2>
            <p>
              <Link href="/admin/tags" className="admin-link">
                ← All tags
              </Link>
            </p>
          </div>
          <div className="chip-row" style={{ alignItems: "center" }}>
            <Link href={`/t/${tag.code}`} className="chip">
              View public page →
            </Link>
            <DeleteButton
              action={deleteTag}
              fields={{ code: tag.code }}
              confirmText={`Delete tag ${tag.code}? Anyone scanning it will get "not found".`}
              label="Delete tag"
            />
          </div>
        </header>

        <dl className="meta-grid">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="meta-label">{label}</dt>
              <dd className="meta-value">{value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Edit contact details</h2>
            <p>These are the details anyone scanning this tag will see.</p>
          </div>
        </header>
        <TagEditForm tag={tag} />
      </article>
    </>
  );
}
