"use client";

import { useState } from "react";
import Script from "next/script";
import QRCode from "qrcode";
import { emptyCustomer } from "@/lib/customer";
import { CustomerForm } from "@/components/CustomerForm";
import { formatInr, isFree } from "@/lib/products";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// `products` comes from the server so the picker always shows current prices.
// The price shown here is display only — the server re-prices every order.
export function GenerateForm({ product: initialProduct, products }) {
  const [product, setProduct] = useState(initialProduct);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const free = isFree(product);
  const canSubmit =
    customer.name.trim() !== "" &&
    customer.phone.trim() !== "" &&
    !submitting &&
    (free || checkoutReady);

  async function issueTag(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not issue this tag.");
    return data;
  }

  async function showTag(code) {
    const url = `${window.location.origin}/t/${code}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });
    setResult({ code, url, qrDataUrl });
  }

  // Free tags are issued straight away; paid ones go through Razorpay first.
  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      if (free) {
        const { code } = await issueTag("/api/tags", { ...customer, product: product.slug });
        await showTag(code);
        return;
      }
      await startPayment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  async function startPayment() {
    const order = await issueTag("/api/orders", { product: product.slug, customer });

    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "Reach-Out",
      description: order.product.name,
      prefill: { name: customer.name, contact: customer.phone, email: customer.email || undefined },
      theme: { color: "#4f46e5" },
      // The tag is only created once the server verifies Razorpay's signature.
      handler: async (response) => {
        try {
          const { code } = await issueTag("/api/orders/verify", response);
          await showTag(code);
        } catch (err) {
          setError(
            err instanceof Error
              ? `${err.message} Your payment reference is ${response.razorpay_payment_id}.`
              : "Payment went through but the tag could not be issued."
          );
        } finally {
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          setError("Payment cancelled — no tag was created and you weren't charged.");
          setSubmitting(false);
        },
      },
    });

    rzp.on("payment.failed", (response) => {
      setError(response?.error?.description ?? "The payment failed. You have not been charged.");
      setSubmitting(false);
    });

    rzp.open();
  }

  return (
    <>
      <Script
        src={CHECKOUT_SRC}
        onReady={() => setCheckoutReady(true)}
        onError={() => setError("Could not load the payment window. Check your connection.")}
      />

      <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-indigo-900/5 sm:grid-cols-2 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Tag type</span>
            <div className="grid gap-2">
              {products.map((p) => (
                <label
                  key={p.slug}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                    p.slug === product.slug
                      ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-600 dark:bg-indigo-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="product"
                      value={p.slug}
                      checked={p.slug === product.slug}
                      disabled={submitting || Boolean(result)}
                      onChange={() => {
                        setProduct(p);
                        setError(null);
                      }}
                      className="accent-indigo-600"
                    />
                    <span className="text-slate-900 dark:text-white">{p.name}</span>
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isFree(p)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {formatInr(p.pricePaise)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <CustomerForm value={customer} onChange={setCustomer} disabledFields={Boolean(result)} />

          {!result && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
            >
              {submitting
                ? free
                  ? "Generating…"
                  : "Opening payment…"
                : free
                  ? "Generate free eTag"
                  : `Pay ${formatInr(product.pricePaise)} & get tag`}
            </button>
          )}

          {!free && !result && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Payments are handled by Razorpay. Your tag is created only after the payment is
              confirmed.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex aspect-square w-full max-w-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            {result ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.qrDataUrl}
                alt="Customer QR code"
                className="h-full w-full rounded-xl"
              />
            ) : (
              <p className="px-6 text-center text-sm text-slate-400">
                {error ??
                  (free
                    ? "Enter at least a name and phone number, then generate your eTag."
                    : `Enter at least a name and phone number, then pay ${formatInr(product.pricePaise)} to get your ${product.name}.`)}
              </p>
            )}
          </div>
          {result && (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tag code{" "}
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {result.code}
                </span>
              </p>
              <a
                href={result.qrDataUrl}
                download={`${result.code}-qr.png`}
                className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-md"
              >
                Download QR code
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
