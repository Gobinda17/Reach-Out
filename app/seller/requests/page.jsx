import { prisma } from "@/lib/db";
import { getSeller } from "@/lib/dal";
import { listProducts, productNameMap } from "@/lib/catalogue";
import {
  REQUEST_STATUS_PILL,
  REQUEST_STATUS_LABEL,
  MAX_REQUEST_QUANTITY,
  MAX_OPEN_REQUESTS,
} from "@/lib/tagRequests";
import { TagRequestForm } from "@/components/seller/TagRequestForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { cancelTagRequest } from "../actions";

export default async function SellerRequestsPage() {
  const seller = await getSeller();

  const [products, requests, names, openCount] = await Promise.all([
    listProducts(),
    prisma.tagRequest.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tags: true } } },
    }),
    productNameMap(),
    prisma.tagRequest.count({ where: { sellerId: seller.id, status: "PENDING" } }),
  ]);

  const productName = (slug) => names.get(slug) ?? slug;

  return (
    <>
      <article className="card">
        <header className="card-header">
          <div>
            <h2>Request tags from admin</h2>
            <p>
              Ask for a batch of blank tags to hand out. Admin approves the request and the tags
              appear under My tags as your stock — up to {MAX_REQUEST_QUANTITY} per request, and{" "}
              {MAX_OPEN_REQUESTS} requests open at a time.
            </p>
          </div>
        </header>
        <TagRequestForm products={products} maxQuantity={MAX_REQUEST_QUANTITY} />
      </article>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Your requests</h2>
            <p>
              {requests.length} request{requests.length === 1 ? "" : "s"}, newest first.
              {openCount > 0 && ` ${openCount} still waiting on admin.`}
            </p>
          </div>
        </header>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Your note</th>
                <th>Status</th>
                <th>Admin&apos;s reply</th>
                <th>Raised</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={7}>
                    You haven&apos;t requested any tags yet.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td>{productName(req.product)}</td>
                    <td>{req.quantity}</td>
                    <td className="muted" style={{ whiteSpace: "pre-line" }}>
                      {req.note ?? "—"}
                    </td>
                    <td>
                      <span className={REQUEST_STATUS_PILL[req.status]}>
                        {REQUEST_STATUS_LABEL[req.status]}
                      </span>
                      {req.status === "APPROVED" && (
                        <div className="muted">{req._count.tags} tags added</div>
                      )}
                    </td>
                    <td className="muted">{req.decisionNote ?? "—"}</td>
                    <td className="muted">{req.createdAt.toLocaleDateString()}</td>
                    <td>
                      {req.status === "PENDING" && (
                        <DeleteButton
                          action={cancelTagRequest}
                          fields={{ id: req.id }}
                          confirmText={`Withdraw your request for ${req.quantity} ${productName(
                            req.product
                          )} tags?`}
                          label="Withdraw"
                          pendingLabel="Withdrawing…"
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
