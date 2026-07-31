import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/db";

export default async function AdminUsersPage() {
  const session = await verifySession();
  if (session.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, phone: true, name: true, role: true, createdAt: true },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Users</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {users.length} registered user{users.length === 1 ? "" : "s"}.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{u.phone}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{u.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {u.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
