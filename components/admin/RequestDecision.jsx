"use client";

import { useActionState } from "react";
import { approveTagRequest, rejectTagRequest } from "@/app/admin/actions";

// Approve and reject share one note field, so whichever button is pressed the
// admin's reason travels with it. Two <form>s can't share an input, so this is a
// single form and the two buttons pick the action via useActionState on each.
export function RequestDecision({ id, quantity, productName }) {
  const [approveState, approveAction, approving] = useActionState(approveTagRequest, null);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectTagRequest, null);
  const pending = approving || rejecting;
  const state = approveState ?? rejectState;

  return (
    <form
      onSubmit={(e) => {
        // The approve button mints real tags, so make the count explicit before
        // it happens. e.nativeEvent.submitter tells the two buttons apart.
        if (e.nativeEvent.submitter?.value !== "approve") return;
        const ok = window.confirm(
          `Approve this request? ${quantity} blank ${productName} tag${
            quantity === 1 ? "" : "s"
          } will be created and assigned to the seller.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="decisionNote"
        maxLength={500}
        placeholder="Note to the seller (optional)"
        style={{ marginBottom: "0.4rem" }}
      />
      <div className="chip-row">
        <button
          type="submit"
          name="decision"
          value="approve"
          formAction={approveAction}
          disabled={pending}
          className="pill-btn small"
        >
          {approving ? "Approving…" : "Approve"}
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          formAction={rejectAction}
          disabled={pending}
          className="pill-btn pill-btn-ghost pill-btn-danger small"
        >
          {rejecting ? "Rejecting…" : "Reject"}
        </button>
      </div>
      {state?.error && <div className="form-error">{state.error}</div>}
      {state?.ok && <div className="form-success">{state.message}</div>}
    </form>
  );
}
