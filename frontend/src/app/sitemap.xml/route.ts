import { isPublicSite, siteOrigin } from "@/config/seo";
import { notices } from "@/features/notices/model";
import { getPage } from "@/features/outings/api-server";
import { sitemapOutingIds } from "@/features/outings/sitemap";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const headers = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" };
  try {
    const origin = siteOrigin();
    const paths = isPublicSite()
      ? [
          "/",
          "/faq",
          "/notices",
          "/policy/about",
          ...notices.map((notice) => `/notices/${notice.id}`),
          ...(await sitemapOutingIds(getPage)).map((id) => `/detail/${id}`),
        ]
      : [];
    const urls = paths
      .map((path) => `<url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`)
      .join("");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
      { headers },
    );
  } catch {
    return new Response("사이트맵을 불러오지 못했어요.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60", "X-Robots-Tag": "noindex" },
    });
  }
}
