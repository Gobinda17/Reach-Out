import { getSettings } from "@/lib/settings";
import { CALL_PROVIDERS } from "@/lib/calling";
import { CONTACT_REASONS } from "@/lib/contactReasons";
import { SettingsForm } from "@/components/admin/SettingsForm";

// One WHATSAPP_TEMPLATE_<REASON> key per predefined contact reason, plus
// WHATSAPP_TEMPLATE_CUSTOM for a freely typed message with no reason picked
// — see lib/whatsapp.js's templateSettingKey().
const WHATSAPP_TEMPLATE_KEYS = [
  ...CONTACT_REASONS.map((r) => `WHATSAPP_TEMPLATE_${r.key.toUpperCase().replace(/-/g, "_")}`),
  "WHATSAPP_TEMPLATE_CUSTOM",
];

const KEYS = [
  "CALL_PROVIDER",
  "CALLMASK_API_KEY",
  "CALLMASK_WEBHOOK_SECRET",
  "CALLMASK_NUMBERS",
  "OTP_DEV_MODE",
  "RAZORPAY_DEV_MODE",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_TEMPLATE_LANG",
  ...WHATSAPP_TEMPLATE_KEYS,
  "WHATSAPP_OTP_TEMPLATE",
  "WHATSAPP_OTP_TEMPLATE_LANG",
];

export default async function AdminSettingsPage() {
  const values = await getSettings(KEYS);

  // Whether each secret/toggle already has a real value from either the DB
  // setting or the fallback env var — either way the field should read as
  // "configured" and stay blank rather than prompt for re-entry.
  const saved = {
    CALLMASK_API_KEY: Boolean(values.CALLMASK_API_KEY || process.env.CALLMASK_API_KEY),
    CALLMASK_WEBHOOK_SECRET: Boolean(
      values.CALLMASK_WEBHOOK_SECRET || process.env.CALLMASK_WEBHOOK_SECRET
    ),
    RAZORPAY_KEY_ID: Boolean(values.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: Boolean(values.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET),
    RAZORPAY_WEBHOOK_SECRET: Boolean(
      values.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET
    ),
    otpDevModeOn: (values.OTP_DEV_MODE ?? process.env.OTP_DEV_MODE) === "true",
    razorpayDevModeOn: (values.RAZORPAY_DEV_MODE ?? process.env.RAZORPAY_DEV_MODE) === "true",
    WHATSAPP_ACCESS_TOKEN: Boolean(values.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN),
    WHATSAPP_VERIFY_TOKEN: Boolean(values.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN),
    WHATSAPP_APP_SECRET: Boolean(values.WHATSAPP_APP_SECRET || process.env.WHATSAPP_APP_SECRET),
  };
  const callProvider = values.CALL_PROVIDER || process.env.CALL_PROVIDER || "dev";
  const callmaskNumbers = values.CALLMASK_NUMBERS || process.env.CALLMASK_NUMBERS || "";
  const whatsappPhoneNumberId =
    values.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const whatsappTemplateLang =
    values.WHATSAPP_TEMPLATE_LANG || process.env.WHATSAPP_TEMPLATE_LANG || "en_US";
  const whatsappTemplates = Object.fromEntries(
    [...CONTACT_REASONS.map((r) => r.key), "custom"].map((key) => {
      const settingKey = `WHATSAPP_TEMPLATE_${key.toUpperCase().replace(/-/g, "_")}`;
      return [key, values[settingKey] || process.env[settingKey] || ""];
    })
  );
  const whatsappOtpTemplate =
    values.WHATSAPP_OTP_TEMPLATE || process.env.WHATSAPP_OTP_TEMPLATE || "";
  const whatsappOtpTemplateLang =
    values.WHATSAPP_OTP_TEMPLATE_LANG || process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en";

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

      <SettingsForm
        callProviders={CALL_PROVIDERS}
        callProvider={callProvider}
        callmaskNumbers={callmaskNumbers}
        contactReasons={CONTACT_REASONS}
        whatsappPhoneNumberId={whatsappPhoneNumberId}
        whatsappTemplateLang={whatsappTemplateLang}
        whatsappTemplates={whatsappTemplates}
        whatsappOtpTemplate={whatsappOtpTemplate}
        whatsappOtpTemplateLang={whatsappOtpTemplateLang}
        saved={saved}
      />
    </article>
  );
}
