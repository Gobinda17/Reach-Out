"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneField } from "@/components/PhoneField";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20";

const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";

export function PhoneChangeForm({ currentPhone }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState("phone");
  const [fullPhone, setFullPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setEditing(false);
    setStep("phone");
    setFullPhone("");
    setCode("");
    setError(null);
    setDone(false);
  }

  async function handleRequestOtp(e) {
    e.preventDefault();
    if (!fullPhone) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/phone/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not send a code.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Incorrect or expired code.");
      setDone(true);
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
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone number</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{done ? fullPhone : currentPhone}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === "phone" ? handleRequestOtp : handleVerifyOtp}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
    >
      {step === "phone" ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">New phone number</span>
          <PhoneField value={fullPhone} onChange={setFullPhone} required className={fieldShellClass} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {fullPhone
              ? `We'll send a WhatsApp code to ${fullPhone}.`
              : "Enter your new WhatsApp number — the code is sent there, not by SMS."}
          </span>
        </label>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter the 6-digit code we sent on WhatsApp to{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">{fullPhone}</span>.
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${fieldClass} text-center text-lg tracking-[0.3em]`}
            />
          </label>
        </>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">Phone number updated.</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || (step === "phone" && !fullPhone) || done}
          className="rounded-full bg-black px-4 py-2 text-xs font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 disabled:translate-y-0 disabled:opacity-40"
        >
          {step === "phone"
            ? submitting
              ? "Sending…"
              : "Send code"
            : submitting
              ? "Verifying…"
              : "Verify & save"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {done ? "Close" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
