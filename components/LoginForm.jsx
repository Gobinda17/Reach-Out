"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";

const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-950";

const fieldClass = `${fieldShellClass} px-3.5 py-2.5`;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths — "//evil.com" and absolute URLs would otherwise turn
  // this into an open redirect.
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/generate";

  const [step, setStep] = useState("phone");
  // As typed. A bare 10-digit number is read as Indian; other countries need a
  // country code. `fullPhone` is the normalized E.164 form actually sent.
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fullPhone = normalizePhone(phone);

  async function handleRequestOtp(e) {
    e.preventDefault();
    if (!fullPhone) {
      setError(PHONE_ERROR);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
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
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Incorrect or expired code.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={step === "phone" ? handleRequestOtp : handleVerifyOtp}
      className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-indigo-900/5 dark:border-slate-800 dark:bg-slate-900"
    >
      {step === "phone" ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Phone number</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            required
            placeholder="98765 43210 or +1 415 555 2671"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()\-.]/g, ""))}
            className={fieldClass}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {fullPhone
              ? `We'll text ${fullPhone}.`
              : "10 digits for India, or include a country code like +1 or +44."}
          </span>
        </label>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter the 6-digit code we sent to{" "}
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
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="self-start text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Use a different number
          </button>
        </>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting || (step === "phone" && !fullPhone)}
        className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {step === "phone"
          ? submitting
            ? "Sending…"
            : "Send code"
          : submitting
            ? "Verifying…"
            : "Verify & log in"}
      </button>
    </form>
  );
}
