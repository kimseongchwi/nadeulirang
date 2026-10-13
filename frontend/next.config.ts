import type { NextConfig } from "next";
import { isPublicSite } from "./src/config/seo";

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-left" },
  // 존재 여부와 메타데이터를 결정한 뒤 HTML을 전송해 상세 404를 보존한다.
  htmlLimitedBots: /.*/,
  async redirects() {
    return [
      { source: "/guide", destination: "/ui-design", permanent: false },
      { source: "/find", destination: "/search", permanent: false },
    ];
  },
  async headers() {
    return (isPublicSite() ? [
      "/ui-design/:path*", "/mypage", "/settings", "/search", "/api/:path*",
      "/policy/:type(privacy|terms)",
    ] : ["/:path*"]).map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: isPublicSite() ? "noindex" : "noindex, nofollow" }],
    }));
  },
  outputFileTracingIncludes: {
    "/icon": ["./public/images/icon-people-v3.png"],
  },
};

export default nextConfig;
