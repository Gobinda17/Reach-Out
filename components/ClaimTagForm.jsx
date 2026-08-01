"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptyCustomer } from "@/lib/customer";
import { CustomerForm } from "@/components/CustomerForm";

// Lets whoever scans an unclaimed tag fill in their details and take
// ownership of it — the tag then behaves exactly like a self-generated one.
export function ClaimTagForm({ code, initialCustomer }) {
  const router = useRouter();
  const [customer, setCustomer] = useState({ ...emptyCustomer, ...initialCustomer });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [claimed, setClaimed] = useState(false);

  const canSubmit =
    customer.name.trim() !== "" && customer.phone.trim() !== "" && customer.address.trim() !== "";

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${code}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not claim this tag.");
      setClaimed(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (claimed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="font-medium text-emerald-800 dark:text-emerald-300">
          Tag {code} is now yours.
        </p>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Calls and messages from people who scan it will show up on your{" "}
          <a href="/dashboard" className="underline underline-offset-2">
            dashboard
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900"
    >
      <CustomerForm value={customer} onChange={setCustomer} disabledFields={submitting} />

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {submitting ? "Claiming…" : "Claim this tag"}
      </button>

      {!canSubmit && (
        <p className="text-xs text-slate-400">Name, phone number, and address are required.</p>
      )}
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </form>
  );
}
