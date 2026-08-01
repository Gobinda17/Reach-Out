"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import {
  COUNTRIES,
  flagEmoji,
  findCountry,
  detectCountryIso2,
  subscribeToLocale,
  getServerCountryIso2,
} from "@/lib/countryCodes";

const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";

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
  // useSyncExternalStore (not useState+useEffect) so the server and the
  // client's first hydration pass agree on "IN" — detectCountryIso2() reads
  // navigator.language, which doesn't exist during SSR. React reconciles to
  // the real client value in the one extra render this hook is designed for,
  // without a hydration mismatch.
  const detectedIso2 = useSyncExternalStore(subscribeToLocale, detectCountryIso2, getServerCountryIso2);
  // null until the user picks one — falls back to the detected country.
  const [countryOverride, setCountryOverride] = useState(null);
  const countryIso2 = countryOverride ?? detectedIso2;
  // Always exactly the local digits, capped at 10 — the selected country
  // supplies the dial code. `fullPhone` is the composed, normalized E.164
  // form actually sent.
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const country = findCountry(countryIso2);
  const fullPhone = digits.length === 10 ? normalizePhone(`+${country.dialCode}${digits}`) : null;

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
      className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900"
    >
      {step === "phone" ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Phone number</span>
          <div className={`${fieldShellClass} flex items-stretch gap-0`}>
            <select
              value={countryIso2}
              onChange={(e) => setCountryOverride(e.target.value)}
              aria-label="Country code"
              className="shrink-0 rounded-l-xl border-r border-slate-200 bg-transparent py-2.5 pl-3 pr-2 text-slate-700 outline-none dark:border-slate-700 dark:text-slate-200"
            >
              {COUNTRIES.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {flagEmoji(c.iso2)} +{c.dialCode}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              pattern="\d{10}"
              maxLength={10}
              required
              placeholder="10-digit mobile number"
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {fullPhone
              ? `We'll text ${fullPhone}.`
              : `Enter your 10-digit number — we guessed ${country.name}, change it above if that's wrong.`}
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
