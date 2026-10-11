import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicSite, pageMetadata, siteOrigin } from "../src/config/seo.ts";
import { indexableOuting, isOutingId, outingMetadataText } from "../src/features/outings/seo.ts";
import { sitemapOutingIds } from "../src/features/outings/sitemap.ts";

const environment = { SITE_URL: "https://nadeulirang.example", SITE_INDEXABLE: "true", NODE_ENV: "production" };

test("공개 HTTPS 원점 주소·명시적인 허용·운영 모드가 모두 있어야 색인을 허용한다", () => {
  assert.equal(siteOrigin(environment), "https://nadeulirang.example");
  assert.equal(isPublicSite(environment), true);
  for (const patch of [{ SITE_URL: "" }, { SITE_INDEXABLE: "" }, { SITE_INDEXABLE: "false" }, { NODE_ENV: "development" }])
    assert.equal(isPublicSite({ ...environment, ...patch }), false);
  for (const url of ["http://example.com", "https://localhost", "https://localhost.", "https://127.0.0.1", "https://[::1]", "https://app.local", "https://app.localhost", "https://example.com/path", "https://example.com/?q=1", "https://example.com/#x", "https://user:password@example.com", "https://example.com:3031", "invalid"])
    assert.equal(siteOrigin({ SITE_URL: url }), undefined);
});

test("페이지 대표 주소는 공개 주소로만 만들고 검색 제외·실패 페이지의 설정을 보존한다", () => {
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, environment);
    const metadata = pageMetadata("/faq", "질문", "안내");
    assert.equal(metadata.alternates.canonical, "https://nadeulirang.example/faq");
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    assert.deepEqual(pageMetadata(undefined, "오류", "재시도", false).robots, { index: false, follow: true });
    assert.equal(pageMetadata(undefined, "오류", "재시도", false).alternates.canonical, null);
    delete process.env.SITE_URL;
    assert.equal(pageMetadata("/faq", "질문", "안내").alternates.canonical, null);
    assert.deepEqual(pageMetadata("/faq", "질문", "안내").robots, { index: false, follow: false });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("상세 제목은 실제 장소·지역·종류만 쓰고 종료·취소 상태를 보존한다", () => {
  const item = { name: "표본 박물관", kind: "MUSEUM", regionName: "경남", districtName: "김해시", period: "PERMANENT" };
  assert.equal(outingMetadataText(item).title, "표본 박물관 · 경남 김해시 · 박물관 · 나들이랑");
  assert.equal(indexableOuting(item), true);
  for (const state of ["ENDED", "CANCELLED"]) {
    const archived = { ...item, period: state };
    assert.equal(indexableOuting(archived), false);
    assert.match(outingMetadataText(archived).description, state === "ENDED" ? /종료된 행사/ : /취소된 행사/);
  }
  assert.doesNotMatch(outingMetadataText(item).description, /무료|운영 중|예약 가능/);
  assert.equal(indexableOuting({ ...item, period: "INVALID" }), false);
  assert.equal(isOutingId("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"), true);
  for (const id of ["../faq", "constructor", "missing", "00000000-0000-0000-0000-000000000000?x=1"]) assert.equal(isOutingId(id), false);
});

function page(items, total = items.length, number = 1, asOfDate = "2026-10-11") {
  return { ok: true, data: { items, total, page: number, pageSize: 20, asOfDate } };
}
const items = Array.from({ length: 21 }, (_, i) => ({ id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`, period: "PERMANENT" }));

test("사이트맵은 모든 공개 목록 페이지를 읽고 정상 0건을 구분한다", async () => {
  const queries = [];
  const ids = await sitemapOutingIds(async (query) => {
    queries.push(query.toString());
    return query.get("page") === "1" ? page(items.slice(0, 20), 21) : page(items.slice(20), 21, 2);
  });
  assert.deepEqual(ids, items.map((item) => item.id));
  assert.deepEqual(queries, ["page=1&sort=NAME", "page=2&sort=NAME"]);
  assert.deepEqual(await sitemapOutingIds(async () => page([])), []);
});

test("사이트맵은 중간 실패·총수/날짜 변경·중복·비공개 상태를 빈 성공으로 바꾸지 않는다", async () => {
  for (const second of [
    { ok: false, status: 503, message: "실패" }, page(items.slice(20), 22, 2),
    page(items.slice(20), 21, 2, "2026-10-12"), page([items[0]], 21, 2),
    page([{ ...items[20], period: "CANCELLED" }], 21, 2), page([], 21, 2),
    page([{ ...items[20], id: "../faq" }], 21, 2),
  ]) {
    await assert.rejects(sitemapOutingIds(async (query) => query.get("page") === "1" ? page(items.slice(0, 20), 21) : second));
  }
  await assert.rejects(sitemapOutingIds(async () => page([], 50000)));
});
