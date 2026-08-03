"use client";

import { CUSTOMER_FIELDS } from "@/lib/customer";
import { PhoneField } from "@/components/PhoneField";
import { AddressFields } from "@/components/AddressFields";
import { VEHICLE_TYPES } from "@/lib/etagShared";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20 dark:disabled:bg-slate-800/60";

// Same look as fieldClass but for a compound control (select + input) — no
// padding of its own (the children carry their own), and focus-within so the
// border/ring responds no matter which part of the control has focus.
const fieldShellClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";

// Both flags follow the product, and both are re-checked by the API:
// `addressRequired` is false only for a free product, which ships nothing —
// every other tag is posted, so its delivery address is mandatory (landmark
// aside, see validateAddress in lib/customer.js). `vehicleRequired` is true for
// a tag that goes on a vehicle (isVehicleProduct), which needs a plate — the
// same thing /generate asks for on its Vehicle step.
export function CustomerForm({
  value,
  onChange,
  disabledFields,
  addressRequired = true,
  vehicleRequired = true,
}) {
  return (
    <div className="flex flex-col gap-4">
      {CUSTOMER_FIELDS.map((field) =>
        field.key === "address" ? (
          <div key={field.key} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && addressRequired && <span className="text-rose-500"> *</span>}
            </span>
            <p className="-mt-1 text-xs text-slate-400">
              {addressRequired
                ? "We'll deliver your tag to this address. Everything except the landmark is required."
                : "Optional — nothing is posted for this tag."}
            </p>
            <AddressFields
              disabled={disabledFields}
              initialAddress={value.address}
              required={addressRequired}
              onChange={(address) => onChange({ ...value, address })}
            />
          </div>
        ) : field.key === "vehicleMakeModel" ? (
          // A picked type, not free text — the same control and the same field
          // both wizards write to, so a claimed tag describes its vehicle the
          // same way a self-service one does.
          <div key={field.key} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={disabledFields}
                  aria-pressed={value.vehicleMakeModel === type}
                  onClick={() => onChange({ ...value, vehicleMakeModel: type })}
                  className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                    value.vehicleMakeModel === type
                      ? "bg-yellow-400 text-black"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {value.vehicleMakeModel === type ? "✓ " : ""}
                  {type}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <label key={field.key} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {(field.required || (field.key === "vehicleReg" && vehicleRequired)) && (
                <span className="text-rose-500"> *</span>
              )}
            </span>
            {field.key === "notes" ? (
              <textarea
                className={fieldClass}
                rows={2}
                maxLength={2000}
                value={value[field.key]}
                disabled={disabledFields}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
              />
            ) : field.key === "phone" ? (
              <PhoneField
                value={value.phone}
                onChange={(phone) => onChange({ ...value, phone })}
                required={field.required}
                disabled={disabledFields}
                className={fieldShellClass}
                selectClassName="rounded-l-xl disabled:bg-slate-50 dark:disabled:bg-slate-800/60"
                inputClassName="rounded-r-xl disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/60"
              />
            ) : field.key === "vehicleReg" ? (
              // Upper-cased as you type, like the wizard's plate field — a
              // plate is never lower case, and it keeps stored values uniform.
              <input
                className={`${fieldClass} font-mono tracking-wide`}
                type="text"
                maxLength={20}
                placeholder="e.g. DL01AB1234"
                value={value.vehicleReg}
                disabled={disabledFields}
                onChange={(e) => onChange({ ...value, vehicleReg: e.target.value.toUpperCase() })}
              />
            ) : (
              <input
                className={fieldClass}
                type={field.key === "email" ? "email" : "text"}
                maxLength={100}
                value={value[field.key]}
                disabled={disabledFields}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
              />
            )}
          </label>
        )
      )}
    </div>
  );
}
