import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function MarketingLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col pt-16">{children}</main>
      <SiteFooter />
    </>
  );
}
