import { verifySession, getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { PaidTagWizard } from "@/components/PaidTagWizard";
import { DEFAULT_PRODUCT_SLUG } from "@/lib/products";
import { listProducts } from "@/lib/catalogue";
import { paymentDevModeEnabled } from "@/lib/razorpay";
import { ETAG_PRODUCT_SLUG } from "@/lib/etagShared";
import { redirect } from "next/navigation";
import { isFree } from "@/lib/products";

export default async function GeneratePage({ searchParams }) {
  const session = await verifySession();
  const user = await getCurrentUser();

  // Refills the form from whatever was saved on the last tag this user made,
  // so a second tag doesn't mean retyping everything from scratch.
  const lastTag = await prisma.tag.findFirst({
    where: { createdById: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      code: true,
      name: true,
      phone: true,
      email: true,
      vehicleReg: true,
      vehicleMakeModel: true,
      address: true,
      notes: true,
    },
  });

  const { product } = await searchParams;
  const products = await listProducts();
  const selected =
    products.find((p) => p.slug === product) ??
    products.find((p) => p.slug === DEFAULT_PRODUCT_SLUG) ??
    products[0];

  // The free eTag has its own public flow — no login, no address, PDF instead of
  // a posted tag. Anyone landing here with it selected belongs there.
  if (selected && (selected.slug === ETAG_PRODUCT_SLUG || isFree(selected))) {
    redirect("/free-tag");
  }

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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10">
      <PaidTagWizard
        initialCustomer={{
          name: lastTag?.name ?? user?.name ?? "",
          phone: lastTag?.phone ?? session.phone ?? "",
          email: lastTag?.email ?? "",
          vehicleReg: lastTag?.vehicleReg ?? "",
          address: lastTag?.address ?? "",
        }}
        product={selected}
        products={products.filter((p) => !isFree(p))}
        devBypass={await paymentDevModeEnabled()}
      />
    </div>
  );
}
