"use client";

import { useActionState } from "react";
import { updateSettings } from "@/app/admin/actions";

// `saved` flags which secret fields already have a value in the DB or env —
// their inputs stay blank (never echo a real secret back to the browser) and
// show a "saved, leave blank to keep it" placeholder instead.
export function SettingsForm({
  callProviders,
  callProvider,
  callmaskNumbers,
  contactReasons,
  whatsappPhoneNumberId,
  whatsappTemplateLang,
  whatsappTemplates,
  saved,
}) {
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
          <label className="field">
            <span>
              Webhook signing secret{" "}
              {saved.CALLMASK_WEBHOOK_SECRET && "(saved — leave blank to keep it)"}
            </span>
            <input
              name="callmaskWebhookSecret"
              type="password"
              placeholder={saved.CALLMASK_WEBHOOK_SECRET ? "•••••••••••••••• (unchanged)" : "optional"}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Masking numbers (DIDs)</span>
            <input
              name="callmaskNumbers"
              type="text"
              defaultValue={callmaskNumbers}
              placeholder="+917938310816, +91..."
              autoComplete="off"
            />
          </label>
        </div>
        <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
          Configure <code>/api/webhooks/edesy</code> as the masking-route webhook URL in edesy&apos;s
          dashboard for each number below, and paste the same signing secret here if you set one
          there. &quot;Masking numbers&quot; is the comma-separated list of DIDs you&apos;ve bought
          and configured that way — calls are handed out from whichever of these isn&apos;t
          currently in use.
        </p>
        <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
          Separately, configure <code>/api/webhooks/edesy/events</code> as edesy&apos;s account-wide
          <em> event webhook</em> (same signing secret) — without it, a number stays reserved for
          the full 15-minute window after every attempt instead of freeing up as soon as a call
          actually ends or goes unanswered. With only one number in the list above, this matters:
          it&apos;s the difference between one busy caller blocking everyone else for 15 minutes or
          for a few seconds.
        </p>
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
          <label className="field">
            <span>
              Webhook secret {saved.RAZORPAY_WEBHOOK_SECRET && "(saved — leave blank to keep it)"}
            </span>
            <input
              name="razorpayWebhookSecret"
              type="password"
              placeholder={saved.RAZORPAY_WEBHOOK_SECRET ? "•••••••••••••••• (unchanged)" : ""}
              autoComplete="off"
            />
          </label>
        </div>
        <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
          Configure <code>/api/orders/webhook</code> as the endpoint URL in the Razorpay
          Dashboard&apos;s Webhooks section (for the <code>payment.captured</code> and{" "}
          <code>order.paid</code> events), and paste the secret it gives you here — it&apos;s
          separate from the API key/secret above.
        </p>
      </fieldset>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <h3 style={{ marginBottom: "0.5rem" }}>WhatsApp notifications</h3>
        <p className="kpi-sub" style={{ marginBottom: "0.75rem" }}>
          Notifies a tag owner over WhatsApp when someone scans their tag and leaves a message.
          Uses Meta&apos;s WhatsApp Business Cloud API — the phone number ID and token come from
          your app in Meta&apos;s developer dashboard.
        </p>
        <div className="form-grid">
          <label className="field">
            <span>
              Access token {saved.WHATSAPP_ACCESS_TOKEN && "(saved — leave blank to keep it)"}
            </span>
            <input
              name="whatsappAccessToken"
              type="password"
              placeholder={saved.WHATSAPP_ACCESS_TOKEN ? "•••••••••••••••• (unchanged)" : "EAAG..."}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Phone number ID</span>
            <input
              name="whatsappPhoneNumberId"
              type="text"
              defaultValue={whatsappPhoneNumberId}
              placeholder="1234567890"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>
              Webhook verify token{" "}
              {saved.WHATSAPP_VERIFY_TOKEN && "(saved — leave blank to keep it)"}
            </span>
            <input
              name="whatsappVerifyToken"
              type="password"
              placeholder={saved.WHATSAPP_VERIFY_TOKEN ? "•••••••••••••••• (unchanged)" : "choose any string"}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>
              App secret (webhook signing){" "}
              {saved.WHATSAPP_APP_SECRET && "(saved — leave blank to keep it)"}
            </span>
            <input
              name="whatsappAppSecret"
              type="password"
              placeholder={saved.WHATSAPP_APP_SECRET ? "•••••••••••••••• (unchanged)" : "optional"}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Template language code</span>
            <input
              name="whatsappTemplateLang"
              type="text"
              defaultValue={whatsappTemplateLang}
              placeholder="en_US"
              autoComplete="off"
            />
          </label>
        </div>
        <p className="kpi-sub" style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>
          Approved template name per contact reason — each must already exist and be approved in
          Meta&apos;s dashboard. Every template takes two body variables in order: the tag code,
          then the message text.
        </p>
        <div className="form-grid">
          {contactReasons.map((reason) => (
            <label className="field" key={reason.key}>
              <span>
                {reason.icon} {reason.label}
              </span>
              <input
                name={`whatsappTemplate_${reason.key}`}
                type="text"
                defaultValue={whatsappTemplates[reason.key]}
                placeholder={`reachout_notify_${reason.key.replace(/-/g, "_")}`}
                autoComplete="off"
              />
            </label>
          ))}
          <label className="field">
            <span>Custom (no reason picked)</span>
            <input
              name="whatsappTemplate_custom"
              type="text"
              defaultValue={whatsappTemplates.custom}
              placeholder="reachout_notify_custom"
              autoComplete="off"
            />
          </label>
        </div>
        <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
          Configure <code>/api/webhooks/whatsapp</code> as the Callback URL in the app
          dashboard&apos;s &quot;Configure Webhooks&quot; screen, and paste the same verify token
          you set above.
        </p>
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
