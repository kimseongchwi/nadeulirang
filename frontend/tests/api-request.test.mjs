import assert from "node:assert/strict";
import { test } from "node:test";
import { requestJson } from "../src/features/outings/api-request.ts";
import { isPage } from "../src/features/outings/api-contract.ts";

test("공통 요청은 계약에 맞는 빈 결과를 유지하고 잘못된 본문·HTTP 실패·연결 실패를 구분한다", async (t) => {
  const page = { items: [], page: 1, pageSize: 20, total: 0, asOfDate: "2026-10-08" };
  let response = Response.json(page);
  const fetch = t.mock.method(globalThis, "fetch", async () => response);
  assert.deepEqual(await requestJson("/api/outings", isPage), { ok: true, data: page });
  for (const [status, expected] of [[400, 400], [404, 404], [401, 503], [500, 503]]) {
    response = Response.json({ secret: "화면에 전달하지 않는 원본 오류" }, { status });
    const result = await requestJson("/api/outings", isPage);
    assert.equal(result.ok, false);
    assert.equal(result.status, expected);
    assert.equal(JSON.stringify(result).includes("secret"), false);
  }
  for (const invalid of [Response.json({ items: [] }), new Response("잘못된 JSON")]) {
    response = invalid;
    assert.equal((await requestJson("/api/outings", isPage)).status, 503);
  }
  fetch.mock.mockImplementation(async () => { throw new Error("연결 실패"); });
  assert.equal((await requestJson("/api/outings", isPage)).status, 503);
});

test("닫힌 시트의 취소 신호를 요청에 전달하고 캐시·리다이렉트를 허용하지 않는다", async (t) => {
  const controller = new AbortController();
  let signal;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    signal = options.signal;
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    controller.abort();
    signal.throwIfAborted();
  });
  assert.equal((await requestJson("/api/outings", isPage, controller.signal)).status, 503);
  assert.equal(signal.aborted, true);
});
