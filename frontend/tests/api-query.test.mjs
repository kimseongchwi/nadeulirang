import assert from "node:assert/strict";
import { test } from "node:test";
import { backendQuery, orderedHours, orderedNotes, parameters, previewLocation, queryParameters, safeUrl, searchFormQuery, windowDays } from "../src/features/outings/api-query.ts";
import { isDetail, isOptions, isPage, isPhoto, isSummary } from "../src/features/outings/api-contract.ts";
import { badgeInfo, outingSummary, regionLabel } from "../src/features/outings/model.ts";
import { detailContent } from "../src/features/outings/detail-content.ts";

const options = { regions: [{ code: "11", name: "서울특별시", count: 2 }], kinds: [{ code: "MUSEUM", count: 2 }], total: 2, asOfDate: "2026-10-05" };
test("검색 범위 변경은 구간·페이지를 정리하고 이름·지역·종류·정렬을 보존한다", () => {
  const form = new URLSearchParams({ q: " 꽃 ", region: "48", kind: "FESTIVAL", sort: "NAME", scope: "upcoming", days: "30", page: "3" });
  const original = form.toString();
  for (const [scope, period, days] of [["upcoming", "UPCOMING", "14"], ["ongoing", "ONGOING", null], ["permanent", "PERMANENT", null], ["", null, null], ["upcoming:7", "UPCOMING", "7"], ["upcoming:30", "UPCOMING", "30"]]) {
    const input = new URLSearchParams(form); input.set("scope", scope);
    const query = searchFormQuery(input);
    assert.equal(query.get("q"), "꽃"); assert.equal(query.get("region"), "48"); assert.equal(query.get("kind"), "FESTIVAL"); assert.equal(query.get("sort"), "NAME");
    assert.equal(query.has("page"), false); assert.equal(query.get("days"), days);
    assert.equal(backendQuery(query).get("period"), period);
    assert.equal(backendQuery(query).get("days"), days);
  }
  assert.equal(form.toString(), original);
  assert.throws(() => searchFormQuery(new URLSearchParams("scope=upcoming:15")));
});
test("화면 중복만 정리하고 다른 소개·프로그램·주차 안내와 원문을 보존한다", () => {
  const entry = (observationId, field, value) => ({ observationId, field, value });
  const information = {
    description: [entry("소개", "overview", "바다에서 열리는 행사입니다.")],
    hours: [entry("시간", "usetime", "10:00~18:00")],
    notes: [entry("반복 소개", "infoname", "행사소개"), entry("프로그램", "infoname", "행사내용"),
      entry("반복 소개", "infotext", "바다에서 열리는\n행사입니다."), entry("프로그램", "infotext", "드론 비행 및 투표 이벤트"),
      entry("새 소개", "infoname", "행사소개"), entry("새 소개", "infotext", "우천 시 일정이 변경될 수 있습니다."),
      entry("주차", "infoname", "주차 안내"), entry("주차", "infotext", "주차장 무료"),
      entry("시간 반복", "infoname", "운영 시간"), entry("시간 반복", "infotext", "10:00~18:00"),
      entry("빈 안내", "infoname", "준비물"), entry("빈 안내", "infotext", "  ")],
  };
  const original = structuredClone(information);
  const content = detailContent(information);
  assert.deepEqual(content.description.map((value) => value.value), ["바다에서 열리는 행사입니다.", "우천 시 일정이 변경될 수 있습니다."]);
  assert.deepEqual(content.programs.map((note) => [note.title, note.values[0].value]), [["주요 프로그램", "드론 비행 및 투표 이벤트"]]);
  assert.deepEqual(content.notes.map((note) => [note.title, note.values[0].value]), [["주차 안내", "주차장 무료"]]);
  assert.deepEqual(information, original);
  const free = detailContent({ generalFee: [entry("입장", "usefee", "무료")],
    notes: [entry("주차", "infoname", "주차 안내"), entry("주차", "infotext", "무료")] });
  assert.equal(free.notes[0].values[0].value, "무료");
  assert.deepEqual(detailContent({}), { description: [], programs: [], notes: [] });
  assert.deepEqual(detailContent({ description: information.description, notes: information.notes.slice(0, 1).concat(information.notes[2]) }).notes, []);
});
test("소개의 별도 공립 분류만 표시에서 생략하고 본문·다른 분류·원본은 보존한다", () => {
  const entry = (field, value) => ({ observationId: field, field, value });
  const original = { description: [entry("fcltyType", "공립"), entry("overview", "공립 미술관으로 전시·체험을 운영합니다."), entry("fcltyType", "사립")] };
  const before = structuredClone(original);
  assert.deepEqual(detailContent(original).description, original.description.slice(1));
  assert.deepEqual(original, before);
  assert.equal(detailContent({ description: [entry("overview", "공립")] }).description.length, 1);
});
test("허용 사진의 제공처·이용 유형·주소를 검사하고 외부 호스트와 인증 쿼리를 거부한다", () => {
  const photo = { id: "사진", url: "https://tong.visitkorea.or.kr/cms/resource/01/123_image2_1.jpg", thumbnailUrl: null,
    provider: "한국관광공사 TourAPI", attributionUrl: "https://www.data.go.kr/data/15101578/openapi.do", license: "KOGL1", checkedAt: "2026-10-05T00:00:00Z" };
  assert.equal(isPhoto(photo), true);
  for (const url of ["http://tong.visitkorea.or.kr/cms/resource/01/123_image2_1.jpg", "https://evil.example/x.jpg", `${photo.url}?serviceKey=x`, "https://tong.visitkorea.or.kr.evil.example/x.jpg"])
    assert.equal(isPhoto({ ...photo, url }), false);
  assert.equal(isPhoto({ ...photo, license: "KOGL3" }), false);
  assert.equal(isPhoto({ ...photo, provider: "미확인" }), false);
  assert.equal(isPhoto({ ...photo, thumbnailUrl: "https://evil.example/x.jpg" }), false);
});
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
  const summary = { id: "공개 식별자", name: "아주 긴 시설 이름", kind: "EVENT", regionCode: "11", regionName: "서울특별시", districtName: null, period: "CANCELLED", eventStart: "2026-10-05", eventEnd: "2026-10-06", feeStatus: "UNKNOWN", adultFee: null, feeConflict: false, operationVerified: false, collectedAt: null, sourceCheckedAt: null, photo: null };
  const item = outingSummary(summary);
  assert.equal(badgeInfo(item, "2026-10-05", 14).text, "행사 취소");
  assert.equal(badgeInfo(outingSummary({ ...summary, period: "ENDED" }), "2026-10-05", 14).text, "행사 종료");
  assert.equal(badgeInfo(outingSummary({ ...summary, period: "UNKNOWN" }), "2026-10-05", 14).text, "일정 미확인");
  assert.equal(item.district_name, null); assert.equal(item.fee_status, "UNKNOWN");
  assert.equal(isSummary(summary), true);
  assert.equal(isSummary({ ...summary, districtName: undefined }), false);
  assert.equal(isSummary({ ...summary, districtName: 123 }), false);
  const detail = { item: summary, photos: [], sources: [], information: {}, links: [], unconfirmed: [], asOfDate: "2026-10-05" };
  assert.equal(isDetail(detail), true);
  assert.equal(isDetail({ ...detail, evidence: [] }), true);
  assert.equal(isDetail({ ...detail, evidence: [{ field: "adultChrge", value: "0" }] }), false);
  assert.equal(isDetail({ ...detail, evidence: null }), false);
  const missingFee = { field: "adultChrge", value: null, source: "MUSEUM", sourceKey: "시설", url: "https://example.org",
    sourceReference: null, collectedAt: "2026-10-05T00:00:00Z", checkedAt: "2026-10-05T00:00:00Z", stale: true, observationId: "근거" };
  assert.equal(isDetail({ ...detail, evidence: [missingFee] }), true);
  assert.equal(isDetail({ ...detail, information: { generalFee: [missingFee] } }), false);
  assert.equal(isDetail({ ...detail, evidence: [{ ...missingFee, checkedAt: 1 }] }), false);
  const confirmed = { ...summary, districtName: "종로구" };
  const card = outingSummary(confirmed);
  assert.equal(isSummary(confirmed), true);
  assert.equal(regionLabel(card.region_name, card.district_name), previewLocation({ item: confirmed }));
  assert.equal(regionLabel(card.region_name, card.district_name), "서울특별시 종로구");
});
test("공통 요약의 확인된 시군구를 표시하고 반복 안내의 제목과 본문을 묶는다", () => {
  const data = { item: { regionName: "경상남도", districtName: "김해시" } };
  assert.equal(previewLocation(data), "경상남도 김해시");
  assert.equal(previewLocation({ item: { ...data.item, districtName: null } }), "경상남도");
  const notes = [{ observationId: "첫째", field: "infoname", value: "주차" }, { observationId: "둘째", field: "infoname", value: "예약" }, { observationId: "첫째", field: "infotext", value: "무료" }, { observationId: "둘째", field: "infotext", value: "미확인" }];
  assert.deepEqual(orderedNotes(notes).map((entry) => entry.value), ["주차", "무료", "예약", "미확인"]);
  const hours = [{ observationId: "구조화", field: "weekdayOperColseHhmm", value: "18:00" }, { observationId: "문장", field: "usetime", value: "월요일 휴무" }, { observationId: "구조화", field: "weekdayOperOpenHhmm", value: "10:00" }];
  assert.deepEqual(orderedHours(hours).map((entry) => entry.value), ["10:00", "18:00", "월요일 휴무"]);
});
