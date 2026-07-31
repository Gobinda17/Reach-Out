"use client";

import { CUSTOMER_FIELDS } from "@/lib/customer";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-950 dark:disabled:bg-slate-800/60";

export function CustomerForm({ value, onChange, disabledFields }) {
  return (
    <div className="flex flex-col gap-4">
      {CUSTOMER_FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {field.label}
            {field.required && <span className="text-rose-500"> *</span>}
          </span>
          {field.key === "address" || field.key === "notes" ? (
            <textarea
              className={fieldClass}
              rows={2}
              value={value[field.key]}
              disabled={disabledFields}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
            />
          ) : (
            <input
              className={fieldClass}
              type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
              value={value[field.key]}
              disabled={disabledFields}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
            />
          )}
        </label>
      ))}
    </div>
  );
}
