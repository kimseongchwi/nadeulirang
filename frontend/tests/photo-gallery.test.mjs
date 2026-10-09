import assert from "node:assert/strict";
import { test } from "node:test";
import { photoDrag, photoSwipe } from "../src/features/outings/photo-gesture.ts";
import { isDetail } from "../src/features/outings/api-contract.ts";

test("사진 스와이프는 좌우 이동을 구분하고 세로 스크롤·짧은 접촉·대각선 경계를 제외한다", () => {
  const start = { x: 100, y: 100 };
  assert.equal(photoSwipe(start, { x: 40, y: 105 }), 1);
  assert.equal(photoSwipe(start, { x: 150, y: 100 }), -1);
  for (const end of [{ x: 51, y: 100 }, { x: 120, y: 200 }, { x: 160, y: 140 }, start]) assert.equal(photoSwipe(start, end), 0);
});
test("썸네일 드래그는 작은 접촉·세로 이동을 제외하고 가로 이동 거리를 보존한다", () => {
  const start = {x:200,y:100};
  assert.equal(photoDrag(start,{x:30,y:110}),-170);
  assert.equal(photoDrag(start,{x:240,y:103}),40);
  for (const end of [{x:205,y:100},{x:220,y:190},{x:260,y:140},start]) assert.equal(photoDrag(start,end),0);
});

test("상세 사진 계약은 빈 목록·대표 일치를 허용하고 누락·중복·임의 URL을 차단한다", () => {
  const photo = { id: "사진1", url: "https://tong.visitkorea.or.kr/cms/resource/01/123_image2_1.jpg", thumbnailUrl: null,
    provider: "한국관광공사 TourAPI", attributionUrl: "https://www.data.go.kr/data/15101578/openapi.do", license: "KOGL1", checkedAt: "2026-10-09T00:00:00Z" };
  const item = { id: "시설", name: "시설", kind: "MUSEUM", regionCode: "11", regionName: "서울특별시", districtName: null,
    period: "PERMANENT", eventStart: null, eventEnd: null, feeStatus: "UNKNOWN", adultFee: null, feeConflict: false, operationVerified: false,
    collectedAt: null, sourceCheckedAt: null, photo };
  const detail = { item, photos: [photo], sources: [], information: {}, links: [], unconfirmed: [], asOfDate: "2026-10-09" };
  assert.equal(isDetail(detail), true);
  assert.equal(isDetail({ ...detail, item: { ...item, photo: null }, photos: [] }), true);
  for (const photos of [undefined, null, [], [photo, photo], [{ ...photo, url: "https://example.com/photo.jpg" }], [{ ...photo, id: "다른 사진" }]])
    assert.equal(isDetail({ ...detail, photos }), false);
});
