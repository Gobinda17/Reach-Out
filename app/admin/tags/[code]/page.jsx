import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { formatAmount } from "@/lib/products";
import { productNameMap } from "@/lib/catalogue";
import { TagEditForm } from "@/components/admin/TagEditForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { DownloadTagCardButton } from "@/components/admin/DownloadTagCardButton";
import { deleteTag } from "../../actions";

export default async function AdminTagDetailPage({ params }) {
  const { code } = await params;

  const tag = await prisma.tag.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      createdBy: { select: { phone: true, role: true } },
      assignedTo: { select: { id: true, phone: true } },
      order: true,
    },
  });

  if (!tag) notFound();

  const names = await productNameMap();
  // No owner row means this is bulk-generated blank stock, not a tag anyone
  // has taken ownership of yet — the same test the tags list uses.
  const claimed = Boolean(tag.createdById);

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const qrSvg = await QRCode.toString(`${protocol}://${host}/t/${tag.code}`, {
    type: "svg",
    margin: 1,
    color: { dark: "#000000ff", light: "#ffffff00" },
  });

  const facts = [
    ["Product", names.get(tag.product) ?? tag.product],
    ["Status", claimed ? "Claimed" : "Unclaimed"],
    ["Created by", tag.createdBy?.phone ?? "—"],
    [
      "Seller stock",
      tag.assignedTo
        ? `${tag.assignedTo.phone}${tag.requestId ? ` · request #${tag.requestId}` : ""}`
        : "— (house stock)",
    ],
    ["Claimed at", tag.claimedAt ? tag.claimedAt.toLocaleString() : "— (not yet claimed)"],
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
            <DownloadTagCardButton code={tag.code} />
            <DeleteButton
              action={deleteTag}
              fields={{ code: tag.code }}
              confirmText={`Delete tag ${tag.code}? Anyone scanning it will get "not found".`}
              label="Delete tag"
            />
          </div>
        </header>

        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.85rem" }}>
          <div
            style={{
              width: 96,
              height: 96,
              flexShrink: 0,
              borderRadius: "10px",
              background: "#fff",
              padding: "6px",
            }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="kpi-sub" style={{ margin: 0 }}>
            Scans open{" "}
            <span style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
              {protocol}://{host}/t/{tag.code}
            </span>{" "}
            — the same QR printed on the physical tag.
          </p>
        </div>

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
        {claimed ? (
          <TagEditForm tag={tag} />
        ) : (
          // Blank stock has no owner yet, so there are no contact details to
          // edit — the first person to scan it claims it from /t/[code]/claim
          // and fills these in themselves. updateTag() rejects this case too;
          // hiding the form here is only the first of the two gates.
          <p className="kpi-sub" style={{ margin: 0 }}>
            This tag is unclaimed blank stock — it has no owner, so there are no contact details
            to edit. Whoever scans it first claims it at{" "}
            <Link href={`/t/${tag.code}`} className="admin-link">
              /t/{tag.code}
            </Link>{" "}
            and enters their own details.
          </p>
        )}
      </article>
    </>
  );
}
