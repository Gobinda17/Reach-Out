import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning covers this element's own attributes only,
          not its children: browser extensions (ColorZilla's
          cz-shortcut-listen, password managers, Grammarly) commonly stamp
          attributes onto <body> before React hydrates, and there's nothing to
          fix on our side when they do. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
