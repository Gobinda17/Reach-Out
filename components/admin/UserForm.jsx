"use client";

import { useActionState } from "react";
import { createUser, updateUser } from "@/app/admin/actions";
import { PhoneField } from "@/components/PhoneField";
import { ROLE_LABEL } from "@/lib/roles";

// `user` absent → create form. Present → edit form. `roles` is the set this
// actor may grant (see RoleSelect). `roleLockedReason`, when set, freezes the
// role picker and says why — an admin editing their own account, or an ordinary
// admin looking at an admin-level one.
export function UserForm({ user, roles, roleLockedReason }) {
  const roleLocked = Boolean(roleLockedReason);
  const editing = Boolean(user);
  const [state, formAction, pending] = useActionState(editing ? updateUser : createUser, null);

  return (
    <form action={formAction}>
      {editing && <input type="hidden" name="id" value={user.id} />}

      <div className="form-grid">
        <label className="field">
          <span>Phone number *</span>
          <PhoneField name="phone" value={user?.phone ?? ""} required className="phone-field-shell" />
        </label>

        <label className="field">
          <span>Name</span>
          <input name="name" maxLength={100} defaultValue={user?.name ?? ""} placeholder="Optional" />
        </label>

        <label className="field">
          <span>Role *</span>
          <select
            name="role"
            defaultValue={user?.role ?? "CUSTOMER"}
            disabled={roleLocked}
            title={roleLockedReason}
            className="select-control"
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem" }}
          >
            {(user && !roles.includes(user.role) ? [user.role, ...roles] : roles).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* A disabled select submits nothing, so the current role has to ride along
          or the action would see an empty value. */}
      {roleLocked && user && <input type="hidden" name="role" value={user.role} />}
      {roleLocked && <p className="kpi-sub">{roleLockedReason}</p>}

      <div className="form-actions">
        <button type="submit" disabled={pending} className="pill-btn">
          {pending ? "Saving…" : editing ? "Save changes" : "Add user"}
        </button>
        {state?.ok && <span className="form-success">{state.message}</span>}
        {state?.error && <span className="form-error">{state.error}</span>}
      </div>

      {!editing && (
        <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
          10 digits for India, or include a country code like +1. There is no password — they
          sign in with a one-time code sent to this number.
        </p>
      )}
    </form>
  );
}
