"use client";

import { useState } from "react";
import Link from "next/link";
import { PhoneField } from "@/components/PhoneField";
import { VEHICLE_TYPES } from "@/lib/etagShared";
import { downloadTagCard } from "@/lib/tagCard";

const STEPS = ["Start", "You", "Vehicle", "Verify"];

const fieldShell =
  "rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";
const field = `${fieldShell} w-full px-4 py-3 text-base`;

function Stepper({ step }) {
  return (
    <ol className="flex items-start justify-between gap-1">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center gap-1">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`h-0.5 flex-1 ${
                    i <= step ? "bg-yellow-400" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  state === "todo"
                    ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    : "bg-yellow-400 text-black"
                } ${state === "current" ? "ring-2 ring-black ring-offset-2 dark:ring-white" : ""}`}
              >
                {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={`h-0.5 flex-1 ${
                    i < step ? "bg-yellow-400" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-xs ${
                state === "current"
                  ? "font-semibold text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Benefit({ icon, title, body }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
      </div>
    </div>
  );
}

export function FreeEtagWizard() {
  const [step, setStep] = useState(0);
  // Fetched per visitor when the verify step is reached, and again after a
  // wrong answer, so every attempt gets its own sum.
  const [captcha, setCaptcha] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function loadCaptcha() {
    setCaptchaAnswer("");
    setCaptcha(null);
    try {
      const res = await fetch("/api/etag/captcha", { cache: "no-store" });
      setCaptcha(await res.json());
    } catch {
      setError("Couldn't load the verification question. Check your connection.");
    }
  }

  const payload = { name, email, phone, vehicleReg, vehicleType };

  async function post(url, extra) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...extra }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    const data = await post("/api/etag/request-otp", {
      captchaToken: captcha?.token,
      captchaAnswer,
    });
    if (data) {
      setOtp("");
      setOtpOpen(true);
    } else {
      // A rejected sum can't be retried — issue a new one.
      loadCaptcha();
    }
  }

  async function confirm() {
    const data = await post("/api/etag/confirm", { code: otp });
    if (data) {
      setOtpOpen(false);
      setResult(data);
    }
  }

  function reset() {
    setResult(null);
    setName("");
    setEmail("");
    setPhone("");
    setVehicleReg("");
    setVehicleType(VEHICLE_TYPES[0]);
    setCaptchaAnswer("");
    setCaptcha(null);
    setStep(0);
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white">
            ✓
          </span>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">eTag ready</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your free eTag{" "}
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {result.code}
            </span>{" "}
            is live.{" "}
            {result.delivered
              ? `Sent to ${phone} on WhatsApp.`
              : "Download it below — WhatsApp delivery switches on once a sender is configured."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => downloadTagCard(result.code)}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-zinc-900"
            >
              Download eTag
            </button>
            <Link
              href={`/t/${result.code}`}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200"
            >
              View tag page
            </Link>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-yellow-400 px-5 py-2 text-sm font-medium text-amber-700 dark:text-yellow-400"
          >
            Generate for another number
          </button>
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Log in with {phone} any time to manage this tag.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper step={step} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-7 text-white">
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              100% FREE
            </span>
            <h2 className="mt-4 text-3xl font-bold leading-tight">
              Get your eTag PDF
              <br />
              on WhatsApp instantly
            </h2>
            <p className="mt-3 text-sm text-emerald-50">
              No waiting. No delivery charges. Your digital tag arrives as a PDF within seconds.
            </p>
          </div>

          <Benefit
            icon="📄"
            title="PDF eTag delivered instantly"
            body="Print it, stick it, and activate — ready in minutes."
          />
          <Benefit
            icon="💬"
            title="Sent directly on WhatsApp"
            body="Check your WhatsApp after OTP verification."
          />
          <Benefit
            icon="🐷"
            title="Completely free to try"
            body="Perfect to test Reach-Out before buying a physical tag."
          />

          <p className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            ⓘ Need a physical tag?{" "}
            <Link href="/#products" className="font-medium text-amber-600 dark:text-yellow-400">
              Visit the shop
            </Link>{" "}
            for home delivery.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Your details</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We will send the eTag PDF to this WhatsApp number.
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Full Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">WhatsApp Number</span>
            <PhoneField required onChange={setPhone} className={fieldShell} />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Vehicle details
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This will be printed on your free eTag PDF.
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Vehicle Number</span>
            <input
              value={vehicleReg}
              onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
              placeholder="e.g. DL01AB1234"
              maxLength={20}
              required
              className={`${field} font-mono tracking-wide`}
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Vehicle Type</span>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVehicleType(type)}
                  aria-pressed={vehicleType === type}
                  className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                    vehicleType === type
                      ? "bg-yellow-400 text-black"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {vehicleType === type ? "✓ " : ""}
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Almost done</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verify and we will send your free PDF eTag on WhatsApp.
            </p>
          </div>
          <dl className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
            {[
              ["Name", name],
              ["WhatsApp", phone],
              ["Vehicle", vehicleReg],
              ["Type", vehicleType],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {captcha ? `Solve: ${captcha.question} = ?` : "Loading verification…"}
            </span>
            <input
              inputMode="numeric"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value.replace(/[^\d-]/g, ""))}
              placeholder="Enter answer"
              required
              className={field}
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 2) loadCaptcha();
              setStep((s) => s + 1);
            }}
            disabled={(step === 1 && (!name.trim() || !phone)) || (step === 2 && !vehicleReg.trim())}
            className="flex-1 rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:opacity-40"
          >
            {step === 0 ? "Get Free eTag" : "Continue"}
          </button>
        ) : (
          <button
            type="button"
            onClick={sendOtp}
            disabled={busy || !captcha || !captchaAnswer}
            className="flex-1 rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send on WhatsApp"}
          </button>
        )}
      </div>

      {otpOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 dark:bg-slate-900 sm:rounded-3xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Verify OTP</h3>
              <button
                type="button"
                onClick={() => setOtpOpen(false)}
                aria-label="Close"
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Enter the 6-digit OTP sent to {phone}
            </p>
            <input
              inputMode="numeric"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${field} text-center text-2xl tracking-[0.4em]`}
            />
            {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
            <button
              type="button"
              onClick={confirm}
              disabled={busy || otp.length !== 6}
              className="mt-4 w-full rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-40"
            >
              {busy ? "Confirming…" : "Confirm & Send eTag"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
