import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { productNameMap } from "@/lib/catalogue";
import { formatAmount } from "@/lib/products";
import { PrintInvoiceButton } from "@/components/PrintInvoiceButton";
import { Logo } from "@/components/Logo";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-6 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}

export default async function InvoicePage({ params }) {
  const { orderId } = await params;
  const id = Number(orderId);
  if (!Number.isInteger(id)) notFound();

  const session = await verifySession();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: { select: { id: true } }, tag: { select: { code: true } } },
  });
  if (!order) notFound();

  // Only the order's own buyer or an admin can view/download it — this is a
  // billing document, not public like the tag contact card.
  const isOwner = order.userId === session.userId;
  const isAdmin = session.role === "ADMIN";
  if (!isOwner && !isAdmin) notFound();

  const names = await productNameMap();
  const productName = names.get(order.product) ?? order.product;
  const customer = order.customerData ?? {};
  const invoiceNumber = `INV-${String(order.id).padStart(6, "0")}`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-white px-6 py-12 text-slate-900 print:py-0">
      <div className="flex items-start justify-between print:hidden">
        <Logo />
        <PrintInvoiceButton />
      </div>

      <div className="flex items-start justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{invoiceNumber}</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>{order.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
          <p className="mt-1">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                order.status === "PAID"
                  ? "bg-emerald-50 text-emerald-700"
                  : order.status === "FAILED"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {order.status}
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Billed to</h2>
          <div className="mt-2 flex flex-col gap-0.5 text-sm">
            <p className="font-medium text-slate-900">{customer.name ?? "—"}</p>
            {customer.phone && <p className="text-slate-600">{customer.phone}</p>}
            {customer.email && <p className="text-slate-600">{customer.email}</p>}
            {customer.address && (
              <p className="whitespace-pre-line text-slate-600">{customer.address}</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Payment</h2>
          <div className="mt-2">
            <Row label="Razorpay order" value={order.razorpayOrderId} />
            <Row label="Razorpay payment" value={order.razorpayPaymentId} />
            <Row label="Tag" value={order.tag?.code} />
          </div>
        </div>
      </div>

      <div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3 text-slate-800">{productName}</td>
              <td className="py-3 text-right text-slate-800">{formatAmount(order.amountPaise)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-right text-sm font-medium text-slate-500">Total</td>
              <td className="pt-3 text-right text-lg font-semibold text-slate-900">
                {formatAmount(order.amountPaise)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-auto border-t border-slate-200 pt-6 text-xs text-slate-400">
        This invoice was generated automatically by Reach-Out and reflects the amount actually
        charged via Razorpay at time of purchase.
      </p>
    </div>
  );
}
