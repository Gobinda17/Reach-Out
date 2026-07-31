"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { emptyCustomer } from "@/lib/customer";
import { CustomerForm } from "@/components/CustomerForm";

export function GenerateForm() {
  const [customer, setCustomer] = useState(emptyCustomer);
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
      setResult({ code, url, qrDataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-indigo-900/5 sm:grid-cols-2 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4">
        <CustomerForm value={customer} onChange={setCustomer} />
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || submitting}
          className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? "Generating…" : "Generate QR"}
        </button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex aspect-square w-full max-w-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
          {result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.qrDataUrl} alt="Customer QR code" className="h-full w-full rounded-xl" />
          ) : (
            <p className="px-6 text-center text-sm text-slate-400">
              {error ?? "Enter at least a name and phone number, then generate a QR code."}
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
  );
}
