import type { NextConfig } from "next";

/**
 * The carpenter screens moved to /app on 18.09.2026. Every old address — in
 * bookmarks, home-screen icons and emails already sent — lands on its new one.
 * Temporary (307) rather than permanent, so a browser never caches them for good.
 */
const moved = (source: string, destination: string) => ({ source, destination, permanent: false });

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/carpenter/catalog",
        has: [{ type: "query" as const, key: "c", value: "(?<category>[^&]+)" }],
        destination: "/app/catalog/:category",
        permanent: false,
      },
      moved("/carpenter/catalog", "/app/catalog"),
      moved("/carpenter/cart", "/app/order"),
      moved("/carpenter/checkout", "/app/order"),
      moved("/carpenter/orders", "/app/orders"),
      moved("/carpenter/orders/:id", "/app/orders/:id"),
      moved("/carpenter/account", "/app/account"),
      moved("/carpenter/metzion", "/app/metzion"),
      moved("/carpenter/metzion/:path*", "/app/metzion/:path*"),
    ];
  },
};

export default nextConfig;
