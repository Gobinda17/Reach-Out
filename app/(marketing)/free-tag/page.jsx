import { issueCaptcha } from "@/lib/captcha";
import { FreeEtagWizard } from "@/components/FreeEtagWizard";

export const metadata = {
  title: "Free eTag — Reach-Out",
  description: "Get a free digital Reach-Out tag as a PDF, delivered on WhatsApp.",
};

// Public on purpose: the flow verifies the visitor's WhatsApp number with an
// OTP at the end, which is the same proof a login gives. Requiring an account
// first would just be that same OTP, twice.
export default function FreeTagPage() {
  // Issued server-side so the answer never reaches the browser — see lib/captcha.js.
  const captcha = issueCaptcha();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10">
      <FreeEtagWizard captcha={captcha} />
    </div>
  );
}
