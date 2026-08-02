import "server-only";
import { NextResponse } from "next/server";
import { plateIsVerifiable, plateLast4Matches } from "@/lib/plate";
import {
  assertPlateAttempts,
  recordPlateFailure,
  clearPlateFailures,
  PlateAttemptError,
} from "@/lib/callRateLimit";

// Shared by the message and call endpoints so the two can never disagree about
// what counts as a passing answer. Returns a NextResponse to bail out with, or
// null when the visitor may proceed.
//
// The check has to live server-side: the masked plate is all the page ever
// sends, so the browser genuinely doesn't know the answer and couldn't be
// trusted with it anyway.
export function checkPlateGate(tagCode, vehicleReg, submitted) {
  // Tags with no plate (door tags, business cards) have nothing to verify —
  // they'd otherwise be permanently uncontactable.
  if (!plateIsVerifiable(vehicleReg)) return null;

  try {
    assertPlateAttempts(tagCode);
  } catch (err) {
    if (err instanceof PlateAttemptError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  if (!plateLast4Matches(vehicleReg, submitted)) {
    recordPlateFailure(tagCode);
    return NextResponse.json(
      { error: "That doesn't match the plate on this vehicle. Check the last 4 digits." },
      { status: 403 }
    );
  }

  clearPlateFailures(tagCode);
  return null;
}
