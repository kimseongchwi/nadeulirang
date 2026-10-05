import assert from "node:assert/strict";
import { test } from "node:test";
import { backendQuery, orderedHours, orderedNotes, parameters, previewLocation, queryParameters, safeUrl, windowDays } from "../src/features/outings/api-query.ts";
import { isDetail, isOptions, isPage } from "../src/features/outings/api-contract.ts";
import { badgeInfo, outingSummary } from "../src/features/outings/model.ts";

const options = { regions: [{ code: "11", name: "서울특별시", count: 2 }], kinds: [{ code: "MUSEUM", count: 2 }], total: 2, asOfDate: "2026-10-05" };
test("기존 지역명 주소를 실제 코드로 연결하고 없는 지역은 전체로 넓히지 않는다", () => {
  assert.equal(queryParameters(new URLSearchParams("region=서울특별시"), options).get("region"), "11");
  assert.equal(queryParameters(new URLSearchParams("region=99"), options).get("region"), "99");
  assert.equal(queryParameters(new URLSearchParams("region=없는지역"), options).get("region"), "없는지역");
});
test("다가오는 구간·페이지·정렬과 특수문자 이름을 손실 없이 백엔드에 전달한다", () => {
  const query = queryParameters(new URLSearchParams({ q: " 100%_ 봄 ", region: "11", kind: "FESTIVAL", scope: "upcoming", days: "14", page: "2" }), options);
  const api = backendQuery(query);
  assert.equal(api.get("keyword"), "100%_ 봄");
  assert.equal(api.get("period"), "UPCOMING"); assert.equal(api.get("days"), "14");
  assert.equal(api.get("page"), "2"); assert.equal(api.get("sort"), "START_DATE");
  assert.equal(backendQuery(new URLSearchParams("scope=ongoing")).get("sort"), "END_DATE");
  assert.equal(backendQuery(new URLSearchParams("scope=permanent")).get("sort"), "NAME");
  assert.deepEqual([...queryParameters(query, options, true).keys()], ["region", "kind"]);
});
test("중복 조건·잘못된 구간·페이지·종류·긴 검색어는 정상 빈 결과와 구분한다", () => {
  assert.throws(() => parameters({ q: ["첫째", "둘째"] }));
  for (const query of ["page=0", "page=2147483648", "page=1.2", "sort=OTHER", "scope=ended", "kind=OTHER", "scope=upcoming&days=15"]) assert.throws(() => queryParameters(new URLSearchParams(query), options));
  assert.throws(() => queryParameters(new URLSearchParams({ q: "가".repeat(201) }), options));
  assert.equal(windowDays(null), 14); assert.equal(windowDays("30"), 30);
});
test("예약 주소의 위험한 스킴·인증 정보와 잘못된 API 본문을 거부한다", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "https://user:password@example.org", "/relative"]) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl("https://example.org/info"), "https://example.org/info");
  assert.equal(isOptions(options), true); assert.equal(isOptions({ ...options, regions: null }), false);
  assert.equal(isPage({ items: [], page: 1, pageSize: 20, total: 0, asOfDate: "2026-10-05" }), true);
  assert.equal(isPage({ items: [{}], page: 1, pageSize: 20, total: 1, asOfDate: "2026-10-05" }), false);
  assert.equal(isDetail({ item: null }), false);
});
test("실제 API 상태를 표시에 사용하고 미확인 요금·주소에 검토 표본을 채우지 않는다", () => {
  const summary = { id: "공개 식별자", name: "아주 긴 시설 이름", kind: "EVENT", regionCode: "11", regionName: "서울특별시", period: "CANCELLED", eventStart: "2026-10-05", eventEnd: "2026-10-06", feeStatus: "UNKNOWN", adultFee: null, feeConflict: false, operationVerified: false, collectedAt: null, sourceCheckedAt: null };
  const item = outingSummary(summary);
  assert.equal(badgeInfo(item, "2026-10-05", 14).text, "행사 취소");
  assert.equal(badgeInfo(outingSummary({ ...summary, period: "ENDED" }), "2026-10-05", 14).text, "행사 종료");
  assert.equal(badgeInfo(outingSummary({ ...summary, period: "UNKNOWN" }), "2026-10-05", 14).text, "일정 미확인");
  assert.equal(item.district_name, ""); assert.equal(item.fee_status, "UNKNOWN"); assert.deepEqual(item.sources, []);
});
test("주소에서 같은 시·군·구만 간단 보기에 사용하고 반복 안내의 제목과 본문을 묶는다", () => {
  const data = { item: { regionName: "경상남도" }, information: { address: [{ field: "addr1", value: "경상남도 김해시 진례면" }, { field: "rdnmadr", value: "경상남도 김해시 분청로 21" }] } };
  assert.equal(previewLocation(data), "경상남도 김해시");
  assert.equal(previewLocation({ ...data, information: { address: [{ field: "addr1", value: "경상남도 김해시" }, { field: "rdnmadr", value: "경상남도 창원시" }] } }), "경상남도");
  assert.equal(previewLocation({ ...data, information: {} }), "경상남도");
  const notes = [{ observationId: "첫째", field: "infoname", value: "주차" }, { observationId: "둘째", field: "infoname", value: "예약" }, { observationId: "첫째", field: "infotext", value: "무료" }, { observationId: "둘째", field: "infotext", value: "미확인" }];
  assert.deepEqual(orderedNotes(notes).map((entry) => entry.value), ["주차", "무료", "예약", "미확인"]);
  const hours = [{ observationId: "구조화", field: "weekdayOperColseHhmm", value: "18:00" }, { observationId: "문장", field: "usetime", value: "월요일 휴무" }, { observationId: "구조화", field: "weekdayOperOpenHhmm", value: "10:00" }];
  assert.deepEqual(orderedHours(hours).map((entry) => entry.value), ["10:00", "18:00", "월요일 휴무"]);
});
