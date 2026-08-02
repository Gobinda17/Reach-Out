"use client";

import { useState } from "react";
import { PhoneField } from "@/components/PhoneField";

const fieldShell =
  "rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

// The gate in front of both contact routes. Asks for the last four digits of
// the plate — which only someone standing at the vehicle can read, since the
// page itself only ever shows AS01GK#### — plus the caller's number.
//
// It is deliberately not the security boundary: the answer is checked on the
// server (lib/plateGate.js), because anything this component knows, so does
// anyone with devtools.
export function PlateVerifyDialog({
  mode, // "message" | "call"
  platePrefix,
  needsPlate,
  busy,
  error,
  onCancel,
  onSubmit,
}) {
  const [last4, setLast4] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const isCall = mode === "call";
  // A masked call has to reach the visitor back, so their number is required.
  // Everything else is optional: a message is one-way, and the reason picked on
  // the card already says why — the server falls back to that reason as the
  // message body when nothing is typed.
  const canSubmit = (!needsPlate || last4.length === 4) && (isCall ? Boolean(phone) : true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-slate-100 p-6 dark:bg-slate-900">
        {needsPlate && (
          <>
            <p className="font-semibold text-slate-900 dark:text-white">
              Please verify the plate number of the vehicle.
            </p>
            <hr className="my-4 border-slate-300 dark:border-slate-700" />
            <p className="text-slate-700 dark:text-slate-300">
              Please enter the
              <br />
              <span className="font-bold">last 4 digits of vehicle plate number</span>
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="font-mono text-lg font-bold tracking-wide text-slate-900 dark:text-white">
                  {platePrefix}
                </p>
                <span className="mt-1 inline-block rounded bg-yellow-400 px-2 py-0.5 font-mono text-sm font-bold text-black">
                  ####
                </span>
              </div>
              <input
                inputMode="numeric"
                autoFocus
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Last 4 Digits"
                aria-label="Last 4 digits of the plate"
                className={`${fieldShell} flex-1 px-4 py-3.5 text-base`}
              />
            </div>
          </>
        )}

        <p className="mt-5 font-semibold text-slate-800 dark:text-slate-200">
          {isCall
            ? "We will need your phone number to setup a MASKED call between you and the tag owner."
            : "Do you want the vehicle owner to call you? You can enter your number here."}
        </p>
        <div className="mt-2">
          <PhoneField required={isCall} onChange={setPhone} className={fieldShell} />
        </div>

        {!isCall && (
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Your message <span className="font-normal text-slate-500">(optional)</span>
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your car is blocking the gate…"
              className={`${fieldShell} px-4 py-3`}
            />
          </label>
        )}

        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

        <button
          type="button"
          disabled={busy || !canSubmit}
          onClick={() => onSubmit({ last4, phone, message: message.trim() })}
          className="mt-5 w-full rounded-full bg-yellow-400 px-6 py-4 text-base font-bold text-black transition-colors hover:bg-yellow-300 disabled:opacity-40"
        >
          {busy ? "Working…" : isCall ? "Setup Masked Call" : "Message Now"}
        </button>

        <hr className="my-4 border-slate-300 dark:border-slate-700" />

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
