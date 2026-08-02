"use client";

import { useState } from "react";
import { CONTACT_REASONS } from "@/lib/contactReasons";
import { PlateVerifyDialog } from "@/components/PlateVerifyDialog";
import { PhoneIcon, ChatIcon } from "@/components/icons";

const REASON_LIST = CONTACT_REASONS.filter((r) => !r.emergency);
const EMERGENCY = CONTACT_REASONS.find((r) => r.emergency);

// The public contact card. Everything here is one-way by design: the visitor
// picks why they're getting in touch, proves they can read the plate, and the
// owner is reached without either side learning the other's number.
//
// It replaces the old call/message tab switcher — the reason and the plate
// challenge now come first, so both routes share one path through the UI.
export function TagContactPanel({ code, scanToken, maskedPlate, platePrefix, needsPlate, isFree }) {
  const [reason, setReason] = useState(REASON_LIST[0].key);
  const [dialog, setDialog] = useState(null); // "message" | "call" | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [call, setCall] = useState(null);

  function open(mode, presetReason) {
    if (presetReason) setReason(presetReason);
    setError(null);
    setDialog(mode);
  }

  async function submit({ last4, phone, message }) {
    setBusy(true);
    setError(null);
    const isCall = dialog === "call";
    try {
      const res = await fetch(`/api/tags/${code}/${isCall ? "call" : "message"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanToken,
          plateLast4: last4,
          reason,
          ...(isCall ? { callerPhone: phone } : { message, fromPhone: phone || undefined }),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");

      setDialog(null);
      if (isCall) setCall(data);
      else setDone("Your message is on its way to the owner.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (call) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left dark:border-slate-800 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-white">Masked call ready</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dial this number — it connects you to the owner without either of you seeing the
          other&apos;s real number.
        </p>
        <a
          href={`tel:${call.virtualNumber}`}
          className="mt-3 block rounded-xl bg-black px-4 py-3 text-center font-mono text-lg font-semibold text-yellow-400"
        >
          {call.virtualNumber}
        </a>
        {call.devBypass && (
          <p className="mt-2 text-xs text-amber-600 dark:text-yellow-500">
            Development mode — this number is a placeholder and will not connect.
          </p>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="font-semibold text-slate-900 dark:text-white">Message sent</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{done}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Contact vehicle owner
        </h2>

        {maskedPlate && (
          <div className="mt-3 w-fit overflow-hidden rounded-md border-2 border-slate-900 bg-white">
            <div className="bg-[#123184] px-3 py-0.5 text-center text-[10px] font-bold tracking-[0.2em] text-white">
              IND
            </div>
            <div className="flex items-stretch">
              <div className="w-2.5 shrink-0 bg-gradient-to-b from-orange-500 via-white to-green-600" />
              <p className="px-3 py-1.5 font-mono text-xl font-bold tracking-[0.15em] text-black">
                {maskedPlate}
              </p>
            </div>
          </div>
        )}

        {isFree && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            ⓘ Free tag — some limitations apply.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 font-medium text-slate-700 dark:text-slate-300">
          Why contact the vehicle owner?
        </p>
        <div className="flex flex-col gap-2">
          {REASON_LIST.map((r) => (
            <label
              key={r.key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                reason === r.key
                  ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <span aria-hidden>{r.icon}</span>
              <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">{r.label}</span>
              <input
                type="radio"
                name="reason"
                value={r.key}
                checked={reason === r.key}
                onChange={() => setReason(r.key)}
                className="h-4 w-4 accent-yellow-400"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => open("message")}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3.5 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-400"
        >
          <ChatIcon className="h-4 w-4" />
          Message
        </button>
        <button
          type="button"
          onClick={() => open("call")}
          className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3.5 font-semibold text-black hover:bg-yellow-300"
        >
          <PhoneIcon className="h-4 w-4" />
          Private call
        </button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Spam may get your number blocked for up to 6 months.
      </p>

      {EMERGENCY && (
        <button
          type="button"
          onClick={() => open("call", EMERGENCY.key)}
          className="rounded-xl border border-rose-300 bg-white px-4 py-3.5 font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:bg-slate-900 dark:text-rose-400"
        >
          {EMERGENCY.icon} Emergency
        </button>
      )}
      <p className="text-center text-xs text-slate-400">
        Emergency reaches the owner through the same masked call — it does not contact emergency
        services.
      </p>

      {error && !dialog && <p className="text-sm text-rose-500">{error}</p>}

      {dialog && (
        <PlateVerifyDialog
          mode={dialog}
          platePrefix={platePrefix}
          needsPlate={needsPlate}
          busy={busy}
          error={error}
          onCancel={() => {
            setDialog(null);
            setError(null);
          }}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
