"use client";

import { useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { emptyCustomer } from "@/lib/customer";
import { composeTagCard, TAG_CARD_ASPECT } from "@/lib/tagCard";
import { CustomerForm } from "@/components/CustomerForm";
import { StepLabel } from "@/components/StepLabel";
import { QrIcon } from "@/components/icons";

export function GenerateForm({ initialCustomer }) {
  const [customer, setCustomer] = useState({ ...emptyCustomer, ...initialCustomer });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const canGenerate = customer.name.trim() !== "" && customer.phone.trim() !== "";

  async function handleGenerate() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not save these details.");
      }
      const { code } = await res.json();
      const url = `${window.location.origin}/t/${code}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 320,
      });
      const cardDataUrl = await composeTagCard({ qrDataUrl, code });
      setResult({ code, url, qrDataUrl, cardDataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 sm:grid-cols-2 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4">
        <StepLabel n={1}>Your details</StepLabel>
        <p className="-mt-2 text-xs text-slate-400">
          We&apos;ve filled in your name and phone from your account — edit them if this tag is
          for someone else.
        </p>
        <CustomerForm value={customer} onChange={setCustomer} />
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || submitting}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? "Generating…" : "Generate QR"}
        </button>
        {!canGenerate && (
          <p className="text-xs text-slate-400">Name and phone number are required to continue.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <StepLabel n={2}>Your QR code</StepLabel>
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
                {error ?? "Fill in step 1, then generate — your printable tag card will appear here."}
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
                  Or head to <Link href="/scan" className="underline underline-offset-2">Scan a tag</Link> to try
                  the full lookup flow.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
