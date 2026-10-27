import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticsPageUrl } from "../src/config/analytics.ts";

const origin = "https://nadeulirang.vercel.app";

test("공개 페이지 조회에서 검색어·필터·인증 쿼리와 모달 해시를 제거한다", () => {
  for (const path of ["/", "/search", "/faq", "/notices", "/notices/1", "/policy/privacy", "/policy/terms", "/policy/about", "/detail/12345678-1234-1234-1234-123456789abc"]) {
    assert.equal(analyticsPageUrl(`${origin}${path}?q=개인검색어&token=비공개#preview`), `${origin}${path}`);
  }
});

test("로그인·API·개인 화면·가이드·알 수 없는 경로는 집계하지 않는다", () => {
  for (const path of ["/login", "/api/auth/callback", "/mypage", "/settings", "/ui-design", "/account", "/detail/개인정보", "/notices/email@example.com", "/unknown"]) {
    assert.equal(analyticsPageUrl(`${origin}${path}`), null);
  }
});

test("미리보기·이전 별칭·로컬·외부 원점과 잘못된 URL은 제외한다", () => {
  for (const url of ["https://nadeulirang-review.vercel.app/", "https://nadeulirang-preview.vercel.app/", "http://localhost:3000/", "https://example.com/", "https://nadeulirang.vercel.app.evil.example/", "http://nadeulirang.vercel.app/", "https://user:secret@nadeulirang.vercel.app/", "/search", "invalid"]) {
    assert.equal(analyticsPageUrl(url), null);
  }
});
