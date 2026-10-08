import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceLines, hoursInformation } from "../src/features/outings/detail-information.ts";

const entry = (field, value, observationId = "행") => ({ field, value, observationId });
test("평일·휴일의 같은 행 시각만 연결하고 누락 시각과 별도 안내를 보존한다", () => {
  assert.deepEqual(hoursInformation([
    entry("weekdayOperOpenHhmm", "09:30"), entry("weekdayOperColseHhmm", "17:30"),
    entry("holidayOperOpenHhmm", "09:30"), entry("holidayCloseOpenHhmm", "17:30"),
  ]), [{ label: "평일", value: "09:30 – 17:30" }, { label: "휴일", value: "09:30 – 17:30" }]);
  assert.deepEqual(hoursInformation([
    entry("weekdayOperOpenHhmm", "09:00", "첫째"), entry("weekdayOperColseHhmm", "18:00", "둘째"),
    entry("usetimeculture", "화~금 09:30–17:30<br>입장 마감 17:00", "설명"),
  ]), [{ label: "평일", value: "09:00 – 종료 시각 미확인" }, { label: "평일", value: "시작 시각 미확인 – 18:00" }, { label: "", value: "화~금 09:30–17:30\n입장 마감 17:00" }]);
});

test("감귤박물관의 괄호·단체 조건·도민 대상을 손상 없이 나누고 불완전 원문은 보존한다", () => {
  const raw = "[개인]- 일반 1,500원- 청소년 1,000원- 어린이 800원[단체(10인 이상)]- 일반 1,000원- 청소년 700원- 어린이 500원 [개인/단체 도민]- 일반 750원";
  assert.deepEqual(evidenceLines(entry("usefee", raw), "fee"), [
    "[개인]", "일반 1,500원", "청소년 1,000원", "어린이 800원", "[단체(10인 이상)]",
    "일반 1,000원", "청소년 700원", "어린이 500원", "[개인/단체 도민]", "일반 750원",
  ]);
  for (const raw of ["[단체(10인 이상", "청소년(13세~18세)/군인(하사 이하) 1,500원", "기간 2026-10-01~2026-10-31 / 전화 064-760-6398"])
    assert.deepEqual(evidenceLines(entry("usefee", raw), "fee"), [raw]);
  assert.deepEqual(evidenceLines(entry("usefee", "어린이 4,000원※ 자세한 사항은 전화문의 요망"), "fee"),
    ["어린이 4,000원", "※ 자세한 사항은 전화문의 요망"]);
});

test("감귤박물관 시각과 입장 마감·계절·전화 조건을 보존한다", () => {
  assert.deepEqual(hoursInformation([entry("usetimeculture", "- 09:00~18:00- 입장 마감 17:30")]),
    [{ label: "", value: "09:00 ~ 18:00\n입장 마감 17:30" }]);
  assert.deepEqual(hoursInformation([entry("usetimeculture", "[하절기] 08:00~19:00[동절기] 08:00~18:00\n※ 방문 전 033-763-1534~5 문의")]),
    [{ label: "", value: "[하절기] 08:00 ~ 19:00\n[동절기] 08:00 ~ 18:00\n※ 방문 전 033-763-1534~5 문의" }]);
});
test("구조화된 0원과 요금은 단위를 표시하고 조건별 슬래시만 나눈다", () => {
  assert.deepEqual(evidenceLines(entry("adultChrge", "0"), "fee"), ["무료"]);
  assert.deepEqual(evidenceLines(entry("usefee", "0원"), "fee"), ["무료"]);
  assert.deepEqual(evidenceLines(entry("usefee", ""), "fee"), []);
  assert.deepEqual(evidenceLines(entry("childChrge", "1000"), "fee"), ["1,000원"]);
  assert.deepEqual(evidenceLines(entry("usefee", "일반 성인 3000/일반 어린이, 청소년 2000/달성군민 성인 1500/달성군민 어린이, 청소년 1000"), "fee"),
    ["일반 성인 3,000원", "일반 어린이, 청소년 2,000원", "달성군민 성인 1,500원", "달성군민 어린이, 청소년 1,000원"]);
  for (const value of ["미확인", "-100", "1/2 할인", "문의 https://example.org/info", "단체 30명 이상", "99999999999999999999"])
    assert.deepEqual(evidenceLines(entry("adultChrge", value), "fee"), [value]);
  assert.deepEqual(evidenceLines(entry("usefee", "1/2 할인 / https://example.org/info"), "fee"), ["1/2 할인 / https://example.org/info"]);
  for (const value of ["성인 할인 기준 연도 2026", "성인 -100", "성인 30명 이상"])
    assert.deepEqual(evidenceLines(entry("usefee", value), "fee"), [value]);
});
test("휴관 목록은 괄호 안 공휴일 예외를 유지하고 원문 객체를 변경하지 않는다", () => {
  const value = entry("rstdeInfo", "매주 월요일(단, 월요일이 공휴일이면 다음 평일),1월1일+설날 당일,추석 당일");
  const original = structuredClone(value);
  assert.deepEqual(evidenceLines(value, "closedDays"), ["매주 월요일(단, 월요일이 공휴일이면 다음 평일)", "1월 1일", "설날 당일", "추석 당일"]);
  assert.deepEqual(value, original);
  assert.deepEqual(evidenceLines(entry("infotext", "1. 프로그램\n본문 / 설명")), ["1. 프로그램\n본문 / 설명"]);
});

test("휴관 안내의 슬래시 날짜·전화·조건은 목록 구분자로 쪼개지 않는다", () => {
  for (const value of ["2026/10/08~2026/10/10 휴관", "휴관 문의 064-760-6398 / 내선 1", "공휴일 / 단 다음 평일 운영", "월요일(공휴일/대체공휴일 제외)"])
    assert.deepEqual(evidenceLines(entry("rstdeInfo", value), "closedDays"), [value]);
  assert.deepEqual(evidenceLines(entry("rstdeInfo", "매주 월요일/설날 당일/추석 당일"), "closedDays"),
    ["매주 월요일", "설날 당일", "추석 당일"]);
});
