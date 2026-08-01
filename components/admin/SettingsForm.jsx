"use client";

import { useActionState } from "react";
import { updateSettings } from "@/app/admin/actions";

// `saved` flags which secret fields already have a value in the DB or env —
// their inputs stay blank (never echo a real secret back to the browser) and
// show a "saved, leave blank to keep it" placeholder instead.
export function SettingsForm({ callProviders, callProvider, saved }) {
  const [state, formAction, pending] = useActionState(updateSettings, null);

  return (
    <form action={formAction} className="form-grid" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Call masking</h3>
        <p className="kpi-sub" style={{ marginBottom: "0.75rem" }}>
          Who bridges &quot;Call the owner&quot; requests. Switching providers here takes effect
          immediately — no redeploy needed.
        </p>
        <div className="form-grid">
          <label className="field">
            <span>Provider</span>
            <select name="callProvider" defaultValue={callProvider} className="select-control">
              {callProviders.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Masking API key {saved.CALLMASK_API_KEY && "(saved — leave blank to keep it)"}</span>
            <input
              name="callmaskApiKey"
              type="password"
              placeholder={saved.CALLMASK_API_KEY ? "•••••••••••••••• (unchanged)" : "vp_..."}
              autoComplete="off"
            />
          </label>
        </div>
      </fieldset>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <h3 style={{ marginBottom: "0.5rem" }}>OTP</h3>
        <label className="checkbox-field">
          <input type="checkbox" name="otpDevMode" defaultChecked={saved.otpDevModeOn} />
          <span>
            Dev mode — every login code is <code>111111</code> instead of a real SMS. Turn this
            off before going live.
          </span>
        </label>
      </fieldset>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Payments (Razorpay)</h3>
        <label className="checkbox-field" style={{ marginBottom: "0.75rem" }}>
          <input type="checkbox" name="razorpayDevMode" defaultChecked={saved.razorpayDevModeOn} />
          <span>Dev mode — skip Razorpay and issue paid tags as already-paid. Turn off for real payments.</span>
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Key ID {saved.RAZORPAY_KEY_ID && "(saved — leave blank to keep it)"}</span>
            <input
              name="razorpayKeyId"
              type="password"
              placeholder={saved.RAZORPAY_KEY_ID ? "•••••••••••••••• (unchanged)" : "rzp_live_..."}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Key secret {saved.RAZORPAY_KEY_SECRET && "(saved — leave blank to keep it)"}</span>
            <input
              name="razorpayKeySecret"
              type="password"
              placeholder={saved.RAZORPAY_KEY_SECRET ? "•••••••••••••••• (unchanged)" : ""}
              autoComplete="off"
            />
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" disabled={pending} className="pill-btn">
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state?.ok && <span className="form-success">{state.message}</span>}
        {state?.error && <span className="form-error">{state.error}</span>}
      </div>
    </form>
  );
}
