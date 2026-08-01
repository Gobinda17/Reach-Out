"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import QRCode from "qrcode";
import { emptyCustomer } from "@/lib/customer";
import { composeTagCard, TAG_CARD_ASPECT } from "@/lib/tagCard";
import { CustomerForm } from "@/components/CustomerForm";
import { StepLabel } from "@/components/StepLabel";
import { QrIcon } from "@/components/icons";
import { formatInr, isFree } from "@/lib/products";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// `products` comes from the server so the picker always shows current prices.
// The price shown here is display only — the server re-prices every order.
export function GenerateForm({ initialCustomer, product: initialProduct, products, devBypass = false }) {
  const [product, setProduct] = useState(initialProduct);
  const [customer, setCustomer] = useState({ ...emptyCustomer, ...initialCustomer });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const free = isFree(product);
  const canGenerate =
    customer.name.trim() !== "" &&
    customer.phone.trim() !== "" &&
    (free || devBypass || checkoutReady);

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
    const cardDataUrl = await composeTagCard({ qrDataUrl, code });
    setResult({ code, url, qrDataUrl, cardDataUrl });
  }

  // Free tags are issued straight away; paid ones go through Razorpay first —
  // unless RAZORPAY_DEV_MODE is on, in which case the server already issued
  // the tag without a real payment and there's no widget to open.
  async function handleGenerate() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      if (free) {
        const { code } = await issueTag("/api/tags", { ...customer, product: product.slug });
        await showTag(code);
        setSubmitting(false);
        return;
      }
      const order = await issueTag("/api/orders", { product: product.slug, customer });
      if (order.devBypass) {
        await showTag(order.code);
        setSubmitting(false);
        return;
      }
      await startPayment(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  async function startPayment(order) {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "Reach-Out",
      description: order.product.name,
      prefill: { name: customer.name, contact: customer.phone, email: customer.email || undefined },
      theme: { color: "#000000" },
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
      {!devBypass && (
        <Script
          src={CHECKOUT_SRC}
          onReady={() => setCheckoutReady(true)}
          onError={() => setError("Could not load the payment window. Check your connection.")}
        />
      )}

      <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 sm:grid-cols-2 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <StepLabel n={1}>Choose your tag</StepLabel>
          <div className="grid gap-2">
            {products.map((p) => (
              <label
                key={p.slug}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                  p.slug === product.slug
                    ? "border-yellow-400 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-500/10"
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
                    className="accent-black dark:accent-yellow-400"
                  />
                  <span className="text-slate-900 dark:text-white">{p.name}</span>
                </span>
                <span
                  className={`font-medium ${
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

          <StepLabel n={2}>Your details</StepLabel>
          <p className="-mt-2 text-xs text-slate-400">
            We&apos;ve filled in your name and phone from your account — edit them if this tag is
            for someone else.
          </p>
          <CustomerForm value={customer} onChange={setCustomer} disabledFields={Boolean(result)} />

          {!result && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || submitting}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
            >
              {submitting
                ? free || devBypass
                  ? "Generating…"
                  : "Opening payment…"
                : free
                  ? "Generate free eTag"
                  : devBypass
                    ? `Get tag (payment bypassed) — ${formatInr(product.pricePaise)}`
                    : `Pay ${formatInr(product.pricePaise)} & get tag`}
            </button>
          )}

          {!result && !canGenerate && (
            <p className="text-xs text-slate-400">
              Name and phone number are required to continue.
            </p>
          )}

          {!result && !free && devBypass && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-yellow-500/10 dark:text-yellow-300">
              Development mode: Razorpay is bypassed — this issues the tag with no real payment.
            </p>
          )}

          {!result && !free && !devBypass && (
            <p className="text-xs text-slate-400">
              Payments are handled by Razorpay. Your tag is created only after the payment is
              confirmed.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <StepLabel n={3}>Your tag card</StepLabel>
          <div
            className="flex w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
            style={{ aspectRatio: TAG_CARD_ASPECT }}
          >
            {result ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.cardDataUrl}
                alt={`Reach-Out tag card${customer.name ? ` for ${customer.name}` : ""}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <QrIcon className="h-4.5 w-4.5" />
                </span>
                <p className="text-sm text-slate-400">
                  {error ??
                    (free
                      ? "Fill in your details, then generate — your printable tag card will appear here."
                      : `Fill in your details, then pay ${formatInr(product.pricePaise)} — your printable tag card will appear here.`)}
                </p>
              </div>
            )}
          </div>

          {result && (
            <div className="flex flex-col gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tag code{" "}
                  <span className="rounded-md bg-yellow-50 px-2 py-0.5 font-mono font-medium text-amber-800 dark:bg-yellow-500/10 dark:text-yellow-300">
                    {result.code}
                  </span>
                </p>
                <a
                  href={result.cardDataUrl}
                  download={`${result.code}-tag.png`}
                  className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md"
                >
                  Download tag card
                </a>
              </div>
              <div className="rounded-xl bg-yellow-50 p-4 text-left text-xs text-amber-900 dark:bg-yellow-500/10 dark:text-yellow-200">
                <p className="font-semibold">What&apos;s next</p>
                <ul className="mt-1.5 list-inside list-disc space-y-1">
                  <li>Download it and print or stick it somewhere visible.</li>
                  <li>
                    See what a scanner would see on{" "}
                    <Link href={result.url} className="underline underline-offset-2">
                      the contact card
                    </Link>
                    .
                  </li>
                  <li>
                    Or head to{" "}
                    <Link href="/scan" className="underline underline-offset-2">
                      Scan a tag
                    </Link>{" "}
                    to try the full lookup flow.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
