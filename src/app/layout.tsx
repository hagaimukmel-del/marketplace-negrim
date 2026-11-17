import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import WelcomePopup from "@/components/WelcomePopup";
import { workBoardOpen } from "@/lib/work-server";
import Script from "next/script";
import "./globals.css";

/**
 * Absolute URLs in the <head> — the link-preview image WhatsApp fetches has to
 * be a full address, and it has to be the production one, not the address of
 * whichever deployment happened to render the page.
 */
function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

const description = "הזמנת חומרים, פרזול וציוד לנגריות, הכל במקום אחד.";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "שוק הנגרים",
  description,
  applicationName: "שוק הנגרים",
  // The image itself is app/opengraph-image.png; these are the words beside it.
  openGraph: {
    type: "website",
    siteName: "שוק הנגרים · Nagarim",
    locale: "he_IL",
    title: "שוק הנגרים — Nagarim B2B Marketplace",
    description,
  },
  appleWebApp: { title: "שוק הנגרים" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // lang="he" matters: it drives font selection, hyphenation and how a screen
  // reader pronounces the page. It said "en" while every string was Hebrew.
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 antialiased">
        {/* Set only on staging, so a test screen is never mistaken for the live site. */}
        {process.env.NEXT_PUBLIC_ENV_LABEL && (
          <div className="bg-amber-400 px-4 py-1 text-center text-xs font-bold text-amber-950 print:hidden">
            {process.env.NEXT_PUBLIC_ENV_LABEL} — נתונים לבדיקה בלבד, לא האתר החי
          </div>
        )}
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
        <WelcomePopup workOpen={workBoardOpen()} />
        {/* Vercel Web Analytics: page views, no cookies. The script is served by
            Vercel itself once Analytics is enabled on the project; on a local or
            staging build it simply 404s. A script tag rather than
            @vercel/analytics, whose optional framework peers clash with vitest's vite. */}
        {process.env.VERCEL_ENV === "production" && (
          <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
