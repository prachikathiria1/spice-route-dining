import type { NextConfig } from "next";

const DEMO = "spice-route";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Old single-restaurant URLs (and already-printed QR codes) keep working.
  async redirects() {
    return [
      { source: "/t/:table", destination: `/r/${DEMO}/t/:table`, permanent: false },
      { source: "/receipt/:id", destination: `/r/${DEMO}/receipt/:id`, permanent: false },
      { source: "/staff", destination: `/r/${DEMO}/staff`, permanent: false },
      { source: "/kitchen", destination: `/r/${DEMO}/kitchen`, permanent: false },
      { source: "/floor", destination: `/r/${DEMO}/floor`, permanent: false },
      { source: "/login", destination: `/r/${DEMO}/login`, permanent: false },
      { source: "/qr", destination: `/r/${DEMO}/admin/tables`, permanent: false },
      { source: "/admin", destination: `/r/${DEMO}/admin`, permanent: false },
      { source: "/admin/:path*", destination: `/r/${DEMO}/admin/:path*`, permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
};

export default nextConfig;
