import type { MetadataRoute } from "next";
import { isPublicSite, siteOrigin } from "@/config/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return isPublicSite()
    ? { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${siteOrigin()}/sitemap.xml` }
    : { rules: { userAgent: "*", allow: "/" } };
}
