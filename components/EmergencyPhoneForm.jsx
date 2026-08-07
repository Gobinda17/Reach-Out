"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneField } from "@/components/PhoneField";

const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";

// Not OTP-gated like PhoneChangeForm — this number is never used to log in,
// just as where the scan page's "Emergency" button rings instead of the tag's
// normal contact number (see app/api/tags/[code]/call/route.js).
export function EmergencyPhoneForm({ currentPhone }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function startEditing() {
    setPhone(currentPhone ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/emergency-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not save that number.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Emergency contact number
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{currentPhone || "Not set"}</p>
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400"
        >
          {currentPhone ? "Change" : "Add"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">Emergency contact number</span>
        <PhoneField value={phone} onChange={setPhone} className={fieldShellClass} />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          When someone taps &quot;Emergency&quot; on your tag, the masked call rings this number
          instead of your usual one. Leave blank to keep using your normal number.
        </span>
      </label>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-black px-4 py-2 text-xs font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 disabled:translate-y-0 disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
