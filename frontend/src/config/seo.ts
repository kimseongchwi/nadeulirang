import type { Metadata } from "next";

type SeoEnvironment = { SITE_URL?: string; SITE_INDEXABLE?: string; NODE_ENV?: string };

// 공개 주소가 없거나 검토 환경이면 검색 노출을 열지 않는다.
export function siteOrigin(environment: SeoEnvironment = process.env): string | undefined {
  try {
    const url = new URL(environment.SITE_URL || "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !url.hostname.includes(".") ||
      url.hostname.endsWith(".") ||
      url.hostname.endsWith(".localhost") ||
      url.hostname.endsWith(".local") ||
      /^[\d.]+$/.test(url.hostname) ||
      url.hostname.includes(":")
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function isPublicSite(environment: SeoEnvironment = process.env) {
  return (
    environment.NODE_ENV === "production" &&
    environment.SITE_INDEXABLE === "true" &&
    !!siteOrigin(environment)
  );
}

export function pageMetadata(
  path: string | undefined,
  title: string,
  description: string,
  indexable = true,
): Metadata {
  const origin = siteOrigin();
  return {
    title,
    description,
    alternates: { canonical: origin && path ? `${origin}${path}` : null },
    robots: { index: isPublicSite() && indexable, follow: isPublicSite() },
  };
}
