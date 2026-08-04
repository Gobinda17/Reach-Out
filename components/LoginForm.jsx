"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PHONE_ERROR } from "@/lib/phone";
import { PhoneField } from "@/components/PhoneField";

const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";

const fieldClass = `${fieldShellClass} px-3.5 py-2.5`;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths — "//evil.com" and absolute URLs would otherwise turn
  // this into an open redirect.
  const requestedNext = searchParams.get("next");
  const explicitNext =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  const [step, setStep] = useState("phone");
  // PhoneField owns the country + digits state and hands back a composed,
  // normalized E.164 string once the number is complete for that country, or
  // "" while it isn't. Using it here (rather than a second copy of the same
  // UI) keeps login on the same rules as every other phone input in the app.
  const [fullPhone, setFullPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      // An explicit ?next= (set by proxy.js when bouncing an unauthenticated
      // visitor off a protected route) always wins — that's where they were
      // actually trying to go. Otherwise send a first-time phone number
      // straight into getting a tag, and a returning one to their account.
      router.push(explicitNext ?? (data?.isNewUser ? "/generate" : "/dashboard"));
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
      className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900"
    >
      {step === "phone" ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Phone number</span>
          <PhoneField required onChange={setFullPhone} className={fieldShellClass} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {fullPhone
              ? `We'll text ${fullPhone}.`
              : "Pick your country, then enter your mobile number."}
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
            className="self-start text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400"
          >
            Use a different number
          </button>
        </>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting || (step === "phone" && !fullPhone)}
        className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
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
