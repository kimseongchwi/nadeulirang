import assert from "node:assert/strict";
import { test } from "node:test";
import { compoundFeeItems, feeParts } from "../src/features/outings/fee-presentation.ts";
const entry = value => ({ field: "usefee", value });

test("요금 그룹 제목·일반 대상·단체/도민 조건과 금액을 보존해 정렬한다", () => {
  const raw = "[개인]- 일반 1,500원- 청소년 1,000원- 어린이 800원[단체(10인 이상)]- 일반 1,000원 [개인/단체 도민]- 일반 750원";
  assert.deepEqual(feeParts(entry(raw)), [
    { kind: "heading", text: "[개인]" }, { kind: "pair", label: "일반", price: "1,500원" },
    { kind: "pair", label: "청소년", price: "1,000원" }, { kind: "pair", label: "어린이", price: "800원" },
    { kind: "heading", text: "[단체(10인 이상)]" }, { kind: "pair", label: "일반", price: "1,000원" },
    { kind: "heading", text: "[개인/단체 도민]" }, { kind: "pair", label: "일반", price: "750원" },
  ]);
  assert.deepEqual(feeParts(entry("청소년(13세~18세)/군인(하사 이하) 1,500원")), [{kind:"pair",label:"청소년(13세~18세)/군인(하사 이하)",price:"1,500원"}]);
});
test("명확한 교육체험 목록의 플러스는 행으로 바꾸고 항목별 가격과 별도 무료 대상을 보존한다", () => {
  const raw = "단체 관람료 1000원+교육체험(보호자 입장권 2000원+아트키친 타일액자 10000원+소품 15000원+컬러링세라믹 10000원)+무료(유치원생~초등학생)";
  const input = entry(raw);
  const before = structuredClone(input);
  const parts = feeParts(input);
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.at(-1), {kind:"pair",label:"유치원생~초등학생",price:"무료"});
  assert.deepEqual(parts[0], {kind:"pair",label:"단체 관람료",price:"1,000원"});
  assert.deepEqual(parts[1], {kind:"group",label:"교육체험",items:[
    {label:"보호자 입장권",price:"2,000원"}, {label:"아트키친 타일액자",price:"10,000원"},
    {label:"소품",price:"15,000원"}, {label:"컬러링세라믹",price:"10,000원"},
  ]});
  const restored = parts.map(part => part.kind === "pair" ? part.price === "무료" ? `무료(${part.label})` : part.label + " " + part.price
    : part.kind === "group" ? part.label + "(" + part.items.map(item => item.label + " " + item.price).join("+") + ")" : part.text).join("+");
  assert.equal(restored.replaceAll(",", ""), raw);
  assert.deepEqual(input, before);
  assert.deepEqual(compoundFeeItems("교육체험", "（보호자 입장권 2000원+체험 10000원）"), [{label:"보호자 입장권",price:"2,000원"},{label:"체험",price:"10,000원"}]);
  for (const text of ["(성인 1000원+어린이 무료)", "(보호자 1000원+체험 2000원 합산)", "(보호자(할인) 1000원+체험 2000원)", "(보호자 1,50원+체험 2000원)", "(보호자 1000원+체험 2000원"])
    assert.equal(compoundFeeItems("교육체험", text), null);
});

test("조건부 무료는 제목으로 쪼개지 않고 유료 조건을 자료 값에 남긴다", () => {
  const raw = "무료(김치체험학교 유료)";
  const input = entry(raw);
  assert.deepEqual(feeParts(input), [{ kind: "text", text: raw }]);
  assert.equal(input.value, raw);
  assert.deepEqual(feeParts(entry("무료(유치원생~초등학생)")), [{ kind: "pair", label: "유치원생~초등학생", price: "무료" }]);
  for (const value of ["무료(어린이 예약 시)", "무료(어린이/보호자 1명+조건)", "무료(초등학생 체험 유료)"])
    assert.deepEqual(feeParts(entry(value)), [{ kind: "text", text: value }]);
  assert.deepEqual(feeParts(entry("[무료 대상]\n주민(신분증 지참)")), [
    { kind: "heading", text: "[무료 대상]" }, { kind: "text", text: "주민(신분증 지참)" },
  ]);
});

test("명시된 시설별 가격과 휴관 조건을 분리하며 원문·날짜·범위·전화번호를 보존한다", () => {
  const raw = "돔하우스 5,000원(공사에 따른 휴관)- 큐빅하우스 3,000원";
  const input = entry(raw);
  assert.deepEqual(feeParts(input), [{ kind: "pair", label: "돔하우스", price: "5,000원", note: "(공사에 따른 휴관)" }, { kind: "pair", label: "큐빅하우스", price: "3,000원" }]);
  assert.equal(input.value, raw);
  for (const text of ["2026-10-09", "1,000원-3,000원", "문의 055-123-4567", "관람 5,000원(휴관 2026-10-09)", "관람 5,000원(공사-휴관)"])
    assert.deepEqual(feeParts(entry(text)), [{ kind: "text", text }]);
});
test("0원·누락·불완전 괄호·합산·날짜·모호한 문장을 무료 전체로 바꾸거나 쪼개지 않는다", () => {
  assert.deepEqual(feeParts(entry("일반 0원")), [{kind:"pair",label:"일반",price:"0원"}]);
  assert.deepEqual(feeParts(entry("")), []);
  for (const raw of ["성인(조건 1000원", "[단체(10인 이상", "입장료 1000원+체험 2000원", "주차·체험 통합 3000원", "성인 할인 기준 연도 2026", "성인 30명 이상", "일반 1,50원", "무료(유아/보호자 1명+조건)", "일반 500원, 청소년 1000원"])
    assert.equal(feeParts(entry(raw)).map(part => part.kind === "item" ? part.label + part.text : part.text).join(""), raw);
});
