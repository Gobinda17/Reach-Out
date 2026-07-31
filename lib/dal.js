import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/session";
import { prisma } from "@/lib/db";

// Optimistic check for Server Components/pages that must be logged in — reads only
// the JWT payload (no DB round trip) and redirects if there's no valid session.
export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.userId) {
    redirect("/login");
  }
  return { userId: session.userId, phone: session.phone, role: session.role };
});

// Non-redirecting, DB-backed lookup for places that need to render differently
// depending on auth state (header) or that must return JSON instead of redirecting
// (Route Handlers).
export const getCurrentUser = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.userId) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, name: true, role: true },
  });
});

// For Server Actions and Route Handlers that mutate admin data. Server Actions are
// reachable by direct POST, so every one of them must re-check this itself —
// the proxy and the admin layout do not protect them.
export const getAdmin = cache(async () => {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
});
