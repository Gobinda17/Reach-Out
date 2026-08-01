import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ADMIN_THEME_KEY } from "@/lib/adminTheme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Reach-Out — Let people reach you, privately",
  description: "A privacy-first contact tag. Scan it, reach the owner, never see their number.",
};

// Applies the saved admin theme before first paint, so a light-theme admin
// never sees a flash of the dark shell. Must live in the ROOT layout, not
// app/admin/layout.jsx — a beforeInteractive script declared in a nested
// layout only runs "before interactive" if that layout happens to be part
// of the very first page load. Reached via client-side navigation (e.g.
// clicking into /admin from a marketing page) it mounts after the page is
// already interactive, which is exactly what triggers React's "script tag
// encountered while rendering" warning. It's a safe no-op on every
// non-admin page, since #adminApp only exists under /admin.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem(${JSON.stringify(ADMIN_THEME_KEY)});var el=document.getElementById("adminApp");if(el&&(t==="light"||t==="dark")){el.dataset.theme=t}}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="admin-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
        {children}
      </body>
    </html>
  );
}
