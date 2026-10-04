import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/guide", destination: "/ui-design", permanent: false },
      { source: "/find", destination: "/search", permanent: false },
    ];
  },
  async headers() {
    return [
      "/",
      "/ui-design/:path*",
      "/search",
      "/detail/:id",
      "/policy/:type(privacy|terms|about)",
    ].map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
  outputFileTracingIncludes: {
    "/icon": ["./public/images/icon-people-v3.png"],
  },
};

export default nextConfig;
