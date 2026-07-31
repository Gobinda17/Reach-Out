"use client";

import { useActionState } from "react";

// `action` is a Server Action passed down from a Server Component. `fields` become
// hidden inputs, so the action receives them through FormData.
export function DeleteButton({ action, fields, confirmText, label = "Delete" }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} className="pill-btn pill-btn-ghost pill-btn-danger small">
        {pending ? "Deleting…" : label}
      </button>
      {state?.error && <div className="form-error">{state.error}</div>}
    </form>
  );
}
