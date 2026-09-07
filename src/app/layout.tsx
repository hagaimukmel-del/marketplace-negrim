import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "שוק הנגרים",
  description: "הזמנת דבקים, קנטים וחומרי עזר לנגריות — ישירות מהספק.",
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
        <AuthProvider>
          <CartProvider>
            <CheckoutProvider>{children}</CheckoutProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
