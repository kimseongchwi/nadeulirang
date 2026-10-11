import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedAuthPath, allowedAuthRedirect, authCookie, proxyAuth } from "../src/features/auth/proxy.ts";

test("인증 중계는 경로·제공자 이동·회원 세션 쿠키만 허용한다", () => {
  for (const path of ["me", "oauth/naver/start", "login/oauth2/code/kakao"]) assert.equal(allowedAuthPath(path), true);
  for (const path of ["../actuator/env", "oauth/other/start", "me/../../outings"]) assert.equal(allowedAuthPath(path), false);
  assert.equal(authCookie("other=ignored; NADEULIRANG_SESSION=abc%3D; secret=ignored"), "NADEULIRANG_SESSION=abc%3D");
  for (const url of ["/account#error", "https://kauth.kakao.com/oauth/authorize?state=test", "https://nid.naver.com/oauth2.0/authorize"]) assert.equal(allowedAuthRedirect(url), true);
  for (const url of ["//evil.test/", "https://kauth.kakao.com.evil.test/oauth/authorize", "https://evil.test/", "https://user@kauth.kakao.com/oauth/authorize"]) assert.equal(allowedAuthRedirect(url), false);
});

test("인증 중계는 다른 출처·누락 출처·큰 본문을 막고 CSRF와 쿠키를 전달한다", async () => {
  const request = (origin, body = "{}") => new Request("http://localhost:3000/api/auth/login", { method: "POST", body, headers: {
    "content-type": "application/json", ...(origin ? { origin } : {}), "x-csrf-token": "test-csrf", cookie: "NADEULIRANG_SESSION=test; other=ignored",
  } });
  let calls = 0;
  const fetcher = async (_url, options) => {
    calls++;
    assert.equal(options.headers.get("x-csrf-token"), "test-csrf");
    assert.equal(options.headers.get("cookie"), "NADEULIRANG_SESSION=test");
    assert.equal(options.redirect, "manual"); assert.equal(options.cache, "no-store");
    return Response.json({ authenticated: true }, { headers: { "set-cookie": "NADEULIRANG_SESSION=new; Path=/; HttpOnly; SameSite=Lax" } });
  };
  for (const origin of [null, "https://evil.test"]) assert.equal((await proxyAuth(request(origin), "login", fetcher)).status, 403);
  assert.equal(calls, 0);
  assert.equal((await proxyAuth(request("http://localhost:3000", "a".repeat(16385)), "login", fetcher)).status, 413);
  const result = await proxyAuth(request("http://localhost:3000"), "login", fetcher);
  assert.equal(result.status, 200); assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(result.headers.getSetCookie().length, 1);
});

test("인증 중계는 제공자 리다이렉트만 전달하고 서버 오류 원문을 숨긴다", async () => {
  const request = new Request("http://localhost:3000/api/auth/oauth2/authorization/kakao");
  const malicious = await proxyAuth(request, "oauth2/authorization/kakao", async () => new Response(null, { status: 302, headers: { location: "https://evil.test" } }));
  assert.equal(malicious.status, 502);
  const valid = await proxyAuth(request, "oauth2/authorization/kakao", async () => new Response(null, { status: 302, headers: { location: "https://kauth.kakao.com/oauth/authorize" } }));
  assert.equal(valid.status, 302);
  const failure = await proxyAuth(request, "me", async () => new Response("내부 DB 오류", { status: 500 }));
  assert.equal(failure.status, 503); assert.equal((await failure.text()).includes("DB"), false);
});
