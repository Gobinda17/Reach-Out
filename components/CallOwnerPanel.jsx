"use client";

import { useState } from "react";
import { PhoneIcon, ShieldIcon } from "@/components/icons";
import { PhoneField } from "@/components/PhoneField";

const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";

export function CallOwnerPanel({ code, scanToken }) {
  const [callerPhone, setCallerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [call, setCall] = useState(null);

  async function handleCall(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${code}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerPhone, scanToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not start a call.");
      setCall(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (call) {
    const expiresLabel = new Date(call.expiresAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
          <PhoneIcon className="h-4 w-4" />
          Masked number ready
        </p>

        {call.devBypass ? (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-yellow-500/10 dark:text-yellow-300">
            Development mode: this is a placeholder number — dialing it won&apos;t connect a real call.
          </div>
        ) : (
          <a
            href={`tel:${call.virtualNumber}`}
            className="self-start rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md"
          >
            Dial {call.virtualNumber}
          </a>
        )}

        <p className="text-xs text-slate-400">
          Valid until {expiresLabel}. Neither of you will see the other&apos;s real number.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleCall}
      className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
        <PhoneIcon className="h-4 w-4" />
        Call the owner
      </p>
      <p className="flex items-start gap-2 text-xs text-slate-400">
        <ShieldIcon className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
        We&apos;ll give you a temporary masked number to dial. It rings straight through to the
        owner — neither of you sees the other&apos;s real number. Your number is only used to set
        up that one masked call.
      </p>
      <PhoneField value={callerPhone} onChange={setCallerPhone} required className={fieldShellClass} />
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !callerPhone}
        className="self-start rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {submitting ? "Getting a number…" : "Get a number to call"}
      </button>
    </form>
  );
}
