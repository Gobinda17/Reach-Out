import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { productNameMap } from "@/lib/catalogue";
import { PhoneChangeForm } from "@/components/PhoneChangeForm";
import { NameEditForm } from "@/components/NameEditForm";
import { EmergencyPhoneForm } from "@/components/EmergencyPhoneForm";
import { DownloadTagButton } from "@/components/DownloadTagButton";
import { PaymentsTable } from "@/components/PaymentsTable";
import { UserIcon, TagIcon, ChatIcon, QrIcon, CameraIcon, PhoneIcon } from "@/components/icons";

function Section({ icon, title, description, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-amber-700 dark:bg-yellow-500/10 dark:text-yellow-400">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">{children}</p>;
}

export default async function DashboardPage() {
  const session = await verifySession();
  const user = await getCurrentUser();

  const [orders, tags, scans, scanCount, sentMessages, madeCalls, names] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { tag: { select: { code: true } } },
    }),
    prisma.tag.findMany({
      where: { createdById: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" } },
        calls: { orderBy: { createdAt: "desc" } },
      },
    }),
    // Capped at 50 most recent — scanCount below carries the true total.
    prisma.scan.findMany({
      where: { scannedById: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { tag: { select: { code: true, product: true, vehicleReg: true } } },
    }),
    prisma.scan.count({ where: { scannedById: session.userId } }),
    prisma.scanMessage.findMany({
      where: { fromUserId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { tag: { select: { code: true } } },
    }),
    prisma.call.findMany({
      where: { initiatedById: session.userId },
      orderBy: { createdAt: "desc" },
      include: { tag: { select: { code: true } } },
    }),
    productNameMap(),
  ]);

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const tagsWithQr = await Promise.all(
    tags.map(async (tag) => ({
      ...tag,
      qrSvg: await QRCode.toString(`${protocol}://${host}/t/${tag.code}`, {
        type: "svg",
        margin: 1,
        color: { dark: "#000000ff", light: "#ffffff00" },
      }),
    }))
  );

  const messages = tags
    .flatMap((tag) => tag.messages.map((message) => ({ ...message, tagCode: tag.code })))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-yellow-100 to-amber-50 opacity-70 blur-3xl dark:from-yellow-500/10 dark:to-transparent"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            My account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your tags, payments, scans, and every message sent or received.
          </p>
        </div>

        <Section icon={<UserIcon className="h-4.5 w-4.5" />} title="Profile">
          <div className="flex flex-col gap-4 divide-y divide-slate-100 dark:divide-slate-800">
            <div>
              <NameEditForm currentName={user?.name} />
            </div>
            <div className="pt-4">
              <PhoneChangeForm currentPhone={session.phone} />
            </div>
            <div className="pt-4">
              <EmergencyPhoneForm currentPhone={user?.emergencyPhone} />
            </div>
          </div>
        </Section>

        <Section
          icon={<QrIcon className="h-4.5 w-4.5" />}
          title="Payments"
          description="Every order you've placed, most recent first."
        >
          <PaymentsTable orders={orders} names={names} />
        </Section>

        <Section
          icon={<TagIcon className="h-4.5 w-4.5" />}
          title="Your tags"
          description="Tags you've created, and how many calls and messages each has received."
        >
          {tagsWithQr.length === 0 ? (
            <EmptyRow>
              You don&apos;t have any tags yet.{" "}
              <Link href="/generate" className="font-medium text-amber-600 dark:text-yellow-400">
                Get one →
              </Link>
            </EmptyRow>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {tagsWithQr.map((tag) => (
                <li key={tag.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-12 w-12 shrink-0 rounded-lg bg-white p-1 ring-1 ring-slate-200 dark:ring-slate-700 [&_svg]:h-full [&_svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: tag.qrSvg }}
                    />
                    <div>
                      <Link
                        href={`/t/${tag.code}`}
                        className="font-mono text-sm font-medium text-slate-800 hover:text-amber-600 dark:text-slate-200 dark:hover:text-yellow-400"
                      >
                        {tag.code}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {names.get(tag.product) ?? tag.product} · {tag.name}
                        {tag.vehicleReg && (
                          <>
                            {" "}
                            ·{" "}
                            <span className="font-mono tracking-wide text-slate-600 dark:text-slate-300">
                              {tag.vehicleReg}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {tag.calls.length} call{tag.calls.length === 1 ? "" : "s"}
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {tag.messages.length} message{tag.messages.length === 1 ? "" : "s"}
                    </span>
                    <DownloadTagButton code={tag.code} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={<ChatIcon className="h-4.5 w-4.5" />}
          title="Messages"
          description="Left by people who scanned your tags — no contact details of theirs are collected unless they choose to share them."
        >
          {messages.length === 0 ? (
            <EmptyRow>No messages yet.</EmptyRow>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className="flex flex-col gap-1.5 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{message.tagCode}</span>
                    <span>{message.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{message.message}</p>
                  {(message.fromName || message.fromPhone) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      — {[message.fromName, message.fromPhone].filter(Boolean).join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={<CameraIcon className="h-4.5 w-4.5" />}
          title="Scans you've made"
          description={`${scanCount} tag${scanCount === 1 ? "" : "s"} looked up, most recent first.${
            scanCount > scans.length ? ` Showing the ${scans.length} most recent.` : ""
          }`}
        >
          {scans.length === 0 ? (
            <EmptyRow>
              You haven&apos;t scanned any tags yet.{" "}
              <Link href="/scan" className="font-medium text-amber-600 dark:text-yellow-400">
                Scan one →
              </Link>
            </EmptyRow>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {scans.map((scan) => (
                <li key={scan.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div>
                    <Link
                      href={`/t/${scan.tag.code}`}
                      className="font-mono text-sm font-medium text-slate-800 hover:text-amber-600 dark:text-slate-200 dark:hover:text-yellow-400"
                    >
                      {scan.tag.code}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {names.get(scan.tag.product) ?? scan.tag.product}
                      {scan.tag.vehicleReg && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="font-mono tracking-wide text-slate-600 dark:text-slate-300">
                            {scan.tag.vehicleReg}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {scan.createdAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={<ChatIcon className="h-4.5 w-4.5" />}
          title="Messages you've sent"
          description="Tags you've contacted — owners never see who messaged them unless you shared your details, so that's all that's shown here too."
        >
          {sentMessages.length === 0 ? (
            <EmptyRow>You haven&apos;t messaged anyone yet.</EmptyRow>
          ) : (
            <ul className="flex flex-col gap-3">
              {sentMessages.map((message) => (
                <li
                  key={message.id}
                  className="flex flex-col gap-1.5 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <Link
                      href={`/t/${message.tag.code}`}
                      className="font-mono hover:text-amber-600 dark:hover:text-yellow-400"
                    >
                      {message.tag.code}
                    </Link>
                    <span>{message.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{message.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={<PhoneIcon className="h-4.5 w-4.5" />}
          title="Calls you've made"
          description="Masked numbers you've requested to reach a tag's owner."
        >
          {madeCalls.length === 0 ? (
            <EmptyRow>You haven&apos;t called anyone yet.</EmptyRow>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {madeCalls.map((call) => (
                <li key={call.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div>
                    <Link
                      href={`/t/${call.tag.code}`}
                      className="font-mono text-sm font-medium text-slate-800 hover:text-amber-600 dark:text-slate-200 dark:hover:text-yellow-400"
                    >
                      {call.tag.code}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {call.status}
                      {call.provider === "dev" && " · dev bypass"}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {call.createdAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
