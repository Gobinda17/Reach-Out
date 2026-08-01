"use client";

import { useActionState } from "react";
import { CUSTOMER_FIELDS } from "@/lib/customer";
import { updateTag } from "@/app/admin/actions";
import { PhoneField } from "@/components/PhoneField";

export function TagEditForm({ tag }) {
  const [state, formAction, pending] = useActionState(updateTag, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="code" value={tag.code} />

      <div className="form-grid">
        {CUSTOMER_FIELDS.map((field) => (
          <label key={field.key} className="field">
            <span>
              {field.label}
              {field.required && " *"}
            </span>
            {field.key === "address" || field.key === "notes" ? (
              <textarea
                name={field.key}
                rows={2}
                maxLength={field.key === "address" ? 500 : 2000}
                defaultValue={tag[field.key] ?? ""}
                required={field.required}
              />
            ) : field.key === "phone" ? (
              <PhoneField
                name="phone"
                value={tag.phone ?? ""}
                required={field.required}
                className="phone-field-shell"
              />
            ) : (
              <input
                name={field.key}
                type={field.key === "email" ? "email" : "text"}
                maxLength={field.key === "name" ? 100 : field.key === "vehicleReg" ? 20 : 100}
                defaultValue={tag[field.key] ?? ""}
                required={field.required}
              />
            )}
          </label>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={pending} className="pill-btn">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.ok && <span className="form-success">{state.message}</span>}
        {state?.error && <span className="form-error">{state.error}</span>}
      </div>
    </form>
  );
}
