"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/products";

const STATUS_STYLE = {
  PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  CREATED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  FAILED: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20";

// `orders` are plain objects, `names` is the product slug->name Map — both
// pre-resolved by the server component, so this stays a small client-only
// filter without any extra data fetching.
export function PaymentsTable({ orders, names }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) => {
      const productName = (names.get(order.product) ?? order.product).toLowerCase();
      return (
        productName.includes(needle) ||
        order.status.toLowerCase().includes(needle) ||
        (order.tag?.code ?? "").toLowerCase().includes(needle)
      );
    });
  }, [orders, names, query]);

  return (
    <div className="flex flex-col gap-3">
      {orders.length > 1 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product, status, or tag code…"
          aria-label="Search payments"
          className={fieldClass}
        />
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {query ? "No payments match that search." : "You haven't placed any orders yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Tag</th>
                <th className="pb-2 font-medium">Placed</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">
                    {names.get(order.product) ?? order.product}
                  </td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">
                    {formatAmount(order.amountPaise)}
                  </td>
                  <td className="py-2.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {order.tag ? (
                      <Link href={`/t/${order.tag.code}`} className="hover:text-amber-600 dark:hover:text-yellow-400">
                        {order.tag.code}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">
                    {order.createdAt.toLocaleDateString()}
                  </td>
                  <td className="py-2.5 text-right">
                    {order.status === "PAID" ? (
                      <Link
                        href={`/invoices/${order.id}`}
                        className="font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                      >
                        Invoice
                      </Link>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
