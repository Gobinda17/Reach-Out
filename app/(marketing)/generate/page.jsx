import { verifySession, getCurrentUser } from "@/lib/dal";
import { GenerateForm } from "@/components/GenerateForm";
import { QrIcon } from "@/components/icons";
import { DEFAULT_PRODUCT_SLUG } from "@/lib/products";
import { listProducts } from "@/lib/catalogue";

export default async function GeneratePage() {
  const session = await verifySession();
  const user = await getCurrentUser();

  const { product } = await searchParams;
  const products = await listProducts();
  const selected =
    products.find((p) => p.slug === product) ??
    products.find((p) => p.slug === DEFAULT_PRODUCT_SLUG) ??
    products[0];

  // Every product can be retired from the admin, so this page has to cope with
  // an empty catalogue rather than rendering an undefined product.
  if (!selected) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-24">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          No tags available right now
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          There are no products on sale at the moment. Please check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-yellow-100 to-amber-50 opacity-70 blur-3xl dark:from-yellow-500/10 dark:to-transparent"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
            <QrIcon className="h-3.5 w-3.5" />
            {selected.name}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Get your {selected.name}
          </h1>
          <p className="max-w-lg text-sm text-slate-500 dark:text-slate-400">
            Fill in the details below. {selected.description} Once the tag is issued you get a short
            code and a QR pointing at it — scanning that QR (with this app or any QR reader) looks
            the details back up.
          </p>
        </div>

        <GenerateForm initialCustomer={{ name: user?.name ?? "", phone: session.phone ?? "" }} />
      </div>
    </div>
  );
}
