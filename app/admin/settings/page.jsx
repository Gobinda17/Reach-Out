import { getSettings } from "@/lib/settings";
import { CALL_PROVIDERS } from "@/lib/calling";
import { SettingsForm } from "@/components/admin/SettingsForm";

const KEYS = [
  "CALL_PROVIDER",
  "CALLMASK_API_KEY",
  "OTP_DEV_MODE",
  "RAZORPAY_DEV_MODE",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

export default async function AdminSettingsPage() {
  const values = await getSettings(KEYS);

  // Whether each secret/toggle already has a real value from either the DB
  // setting or the fallback env var — either way the field should read as
  // "configured" and stay blank rather than prompt for re-entry.
  const saved = {
    CALLMASK_API_KEY: Boolean(values.CALLMASK_API_KEY || process.env.CALLMASK_API_KEY),
    RAZORPAY_KEY_ID: Boolean(values.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: Boolean(values.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET),
    otpDevModeOn: (values.OTP_DEV_MODE ?? process.env.OTP_DEV_MODE) === "true",
    razorpayDevModeOn: (values.RAZORPAY_DEV_MODE ?? process.env.RAZORPAY_DEV_MODE) === "true",
  };
  const callProvider = values.CALL_PROVIDER || process.env.CALL_PROVIDER || "dev";

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Settings</h2>
          <p>
            Operational config that used to require a developer to change and redeploy — now
            editable here. Values saved on this page override the server&apos;s environment variables
            immediately.
          </p>
        </div>
      </header>

      <SettingsForm callProviders={CALL_PROVIDERS} callProvider={callProvider} saved={saved} />
    </article>
  );
}
