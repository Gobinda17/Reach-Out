"use client";

import { useActionState, useRef } from "react";
import { updateUserRole } from "@/app/admin/actions";

const ROLES = ["ADMIN", "SALES", "CUSTOMER"];

export function RoleSelect({ userId, role, disabled, disabledReason }) {
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
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {state?.error && <div className="form-error">{state.error}</div>}
    </form>
  );
}
