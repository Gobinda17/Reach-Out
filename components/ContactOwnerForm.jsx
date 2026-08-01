"use client";

import { useState } from "react";
import { ChatIcon, ShieldIcon } from "@/components/icons";
import { PhoneField } from "@/components/PhoneField";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20";

const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";

export function ContactOwnerForm({ code, scanToken }) {
  const [message, setMessage] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromPhone, setFromPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${code}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, fromName, fromPhone, scanToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not send that message.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex w-full items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-left text-sm text-amber-900 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-200">
        <ShieldIcon className="h-5 w-5 shrink-0" />
        <p>Sent — the owner will see this. They still won&apos;t see your number unless you shared it.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
        <ChatIcon className="h-4 w-4" />
        Message the owner
      </p>
      <textarea
        required
        rows={3}
        placeholder="e.g. Your car is blocking my driveway, please move it when you can."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className={fieldClass}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          maxLength={100}
          placeholder="Your name (optional)"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          className={fieldClass}
        />
        <PhoneField
          value={fromPhone}
          onChange={setFromPhone}
          className={fieldShellClass}
        />
      </div>
      <p className="-mt-1 text-xs text-slate-400">Phone is optional — only for a callback.</p>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !message.trim()}
        className="self-start rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs text-slate-400">
        The owner&apos;s name and number are never shown to you. Sharing yours is optional.
      </p>
    </form>
  );
}
