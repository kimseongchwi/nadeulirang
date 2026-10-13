const sessionCookie = "NADEULIRANG_SESSION";
const fixedPaths = new Set(["csrf", "options", "me", "logout", "sessions/end-all"]);

export function allowedAuthPath(path: string): boolean {
  return fixedPaths.has(path) || /^(?:oauth\/(?:kakao|naver|google)\/start|oauth2\/authorization\/(?:kakao|naver|google)|login\/oauth2\/code\/(?:kakao|naver|google)|admin\/users\/[0-9a-f-]{36})$/.test(path);
}

export function allowedAuthRedirect(location: string): boolean {
  if (location === "/login#completed" || location === "/login#error") return true;
  try {
    const url = new URL(location);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ((url.hostname === "kauth.kakao.com" && url.pathname === "/oauth/authorize") ||
        (url.hostname === "nid.naver.com" && url.pathname === "/oauth2.0/authorize") ||
        (url.hostname === "accounts.google.com" && url.pathname === "/o/oauth2/v2/auth"));
  } catch { return false; }
}

export function authCookie(header: string | null): string {
  return (header ?? "").split(";").map((part) => part.trim()).filter((part) =>
    new RegExp(`^${sessionCookie}=[A-Za-z0-9%_+/=-]*$`).test(part)).join("; ");
}

export async function proxyAuth(request: Request, path: string, fetcher: typeof fetch = fetch): Promise<Response> {
  const fail = (status: number, message: string) => Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  if (!allowedAuthPath(path)) return fail(404, "주소를 확인하세요.");
  const origin = process.env.AUTH_PUBLIC_ORIGIN || "http://localhost:3000";
  if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== origin)
    return fail(403, "요청 출처를 확인하세요.");
  const incoming = new URL(request.url);
  if (incoming.search.length > 4096) return fail(400, "요청을 확인하세요.");
  const headers = new Headers({ Accept: "application/json" });
  const cookie = authCookie(request.headers.get("cookie"));
  if (cookie) headers.set("Cookie", cookie);
  const csrf = request.headers.get("x-csrf-token");
  if (csrf) headers.set("X-CSRF-TOKEN", csrf);
  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return fail(415, "JSON 요청이 필요합니다.");
    if (Number(request.headers.get("content-length")) > 16384) return fail(413, "요청이 너무 큽니다.");
    body = await request.text();
    if (new TextEncoder().encode(body).length > 16384) return fail(413, "요청이 너무 큽니다.");
    headers.set("Content-Type", "application/json");
  }
  try {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:8080";
    const response = await fetcher(`${backend}/api/auth/${path}${incoming.search}`, {
      method: request.method, headers, body, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    const outgoing = new Headers({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    for (const value of response.headers.getSetCookie()) {
      if (value.startsWith(`${sessionCookie}=`)) outgoing.append("Set-Cookie", value);
    }
    const location = response.headers.get("location");
    if (location) {
      if (!allowedAuthRedirect(location)) return fail(502, "인증 이동 주소를 확인하지 못했습니다.");
      outgoing.set("Location", location);
      return new Response(null, { status: response.status, headers: outgoing });
    }
    if (response.status >= 500) return fail(503, "인증 서비스를 사용할 수 없습니다. 잠시 뒤 다시 시도하세요.");
    outgoing.set("Content-Type", "application/json");
    return new Response(request.method === "HEAD" ? null : await response.text(), { status: response.status, headers: outgoing });
  } catch { return fail(503, "인증 서비스를 사용할 수 없습니다. 잠시 뒤 다시 시도하세요."); }
}
