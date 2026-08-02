"use client";

import { useActionState, useRef } from "react";
import { updateUserRole } from "@/app/admin/actions";
import { ROLE_LABEL } from "@/lib/roles";

// `roles` is the set this actor is allowed to grant — an ordinary admin never
// receives the admin-level ones. The current role is always included so the
// select can show it, even when the actor may not change it.
export function RoleSelect({ userId, role, roles, disabled, disabledReason }) {
  const [state, formAction, pending] = useActionState(updateUserRole, null);
  const formRef = useRef(null);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled || pending}
        title={disabled ? disabledReason : undefined}
        onChange={() => formRef.current?.requestSubmit()}
        className="select-control"
      >
        {(roles.includes(role) ? roles : [role, ...roles]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r] ?? r}
          </option>
        ))}
      </select>
      {state?.error && <div className="form-error">{state.error}</div>}
    </form>
  );
}
