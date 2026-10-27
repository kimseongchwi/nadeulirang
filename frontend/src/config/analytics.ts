const analyticsOrigin = "https://nadeulirang.vercel.app";
const publicPage =
  /^(?:\/|\/search|\/faq|\/notices(?:\/[1-9]\d*)?|\/policy\/(?:privacy|terms|about)|\/detail\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function analyticsPageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.origin !== analyticsOrigin ||
      url.username ||
      url.password ||
      !publicPage.test(url.pathname)
    ) {
      return null;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}
