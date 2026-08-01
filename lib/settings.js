import "server-only";
import { prisma } from "@/lib/db";

// DB-backed settings override the matching env var at runtime, so an admin
// can change these from /admin/settings without a redeploy. Falls back to
// the env var (or a hardcoded default) whenever no row exists yet, so
// nothing breaks before an admin first saves a setting.
export async function getSetting(key, fallback = null) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? row.value : fallback;
}

// Batched read for a settings-page form — one query instead of N.
export async function getSettings(keys) {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(keys.map((k) => [k, byKey.get(k) ?? null]));
}

export async function setSetting(key, value) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
