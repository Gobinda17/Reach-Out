"use client";

import { useActionState } from "react";
import { createUser, updateUser } from "@/app/admin/actions";

const ROLES = ["CUSTOMER", "SALES", "ADMIN"];

// `user` absent → create form. Present → edit form.
export function UserForm({ user, isSelf }) {
  const editing = Boolean(user);
  const [state, formAction, pending] = useActionState(editing ? updateUser : createUser, null);

  return (
    <form action={formAction}>
      {editing && <input type="hidden" name="id" value={user.id} />}

      <div className="form-grid">
        <label className="field">
          <span>Phone number *</span>
          <input
            name="phone"
            type="tel"
            defaultValue={user?.phone ?? ""}
            placeholder="98765 43210 or +1 415 555 2671"
            required
          />
        </label>

        <label className="field">
          <span>Name</span>
          <input name="name" defaultValue={user?.name ?? ""} placeholder="Optional" />
        </label>

        <label className="field">
          <span>Role *</span>
          <select
            name="role"
            defaultValue={user?.role ?? "CUSTOMER"}
            disabled={isSelf}
            title={isSelf ? "You can't change your own role." : undefined}
            className="select-control"
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem" }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* A disabled select submits nothing, so the current role has to ride along
          or the action would see an empty value. */}
      {isSelf && <input type="hidden" name="role" value={user.role} />}

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
