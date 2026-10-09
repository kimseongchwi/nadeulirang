import assert from "node:assert/strict";
import { test } from "node:test";
import { routeFeeBlocks } from "../src/features/outings/fee-blocks.ts";
import { detailContent } from "../src/features/outings/detail-content.ts";
const entry = (field, value, observationId = "행") => ({ field, value, observationId });
test("곡성 이용요금 블록의 할인·기간·무료 조건을 입장료에 연결하고 프로그램 중복을 없앤다", () => {
  const fee = "[이용요금]\n- 개인 5,000원\n- 단체(대인 30명 이상 / 소인 15명 이상) : 대인 4,500원 / 소인 4,000원\n- 축제 기간 중 초등학생 이하 무료 입장";
  const original = { generalFee: [entry("usetimefestival", "유료")], notes: [
    entry("infoname", "행사내용"), entry("infotext", "1. 개막행사\n- 공연\n\n" + fee),
  ] };
  const before = structuredClone(original);
  const routed = routeFeeBlocks(original);
  assert.equal(routed.generalFee[0].value, fee);
  assert.equal(routed.generalFee.length, 1);
  assert.equal(detailContent(routed).programs[0].values[0].value, "1. 개막행사\n- 공연\n\n");
  assert.deepEqual(original, before);
  assert.deepEqual(routeFeeBlocks(routed), routed);
});
test("셔틀·주차·체험 요금은 추가 요금으로 두고 금액만 있는 일반 설명을 옮기지 않는다", () => {
  const routed = routeFeeBlocks({ generalFee: [entry("usetimefestival", "유료(셔틀버스 이용료 3,000원)")],
    notes: [entry("infoname", "준비물"), entry("infotext", "10,000원 상당 선물")] });
  assert.equal(routed.generalFee.length, 0);
  assert.equal(routed.extraFee[0].value, "유료(셔틀버스 이용료 3,000원)");
  assert.equal(routed.notes.length, 2);
  const body = "[체험요금]\n5,000원(주민 할인, 증빙 지참)\n[준비물]\n모자";
  const blocks = routeFeeBlocks({ notes: [entry("infotext", body)] });
  assert.equal(blocks.extraFee[0].value, "[체험요금]\n5,000원(주민 할인, 증빙 지참)\n");
  assert.equal(blocks.notes[0].value, "[준비물]\n모자");
});
test("반복 행사내용 없이 확보한 program을 표시하고 같은 요금 블록·본문은 한 번만 남긴다", () => {
  const body = "주요프로그램 : 드론 비행\n[이용요금] 무료\n";
  const routed = routeFeeBlocks({ notes: [
    entry("program", body, "소개"), entry("infoname", "행사내용"), entry("infotext", body),
  ] });
  assert.equal(routed.generalFee.length, 1);
  assert.equal(detailContent(routed).programs.length, 1);
  assert.equal(detailContent(routed).programs[0].values[0].value, "주요프로그램 : 드론 비행\n");
});
test("확보한 할인·예약 조건은 제목 기준으로 연결하고 주석·증빙·중복 여부를 바꾸지 않는다", () => {
  const discount = "2026-10-01~10-31 주민 50% 할인(신분증 지참, 중복 불가)";
  const reservation = "단체 20명 이상 사전예약 필수";
  const routed = routeFeeBlocks({ notes: [
    entry("infoname", "할인 안내", "할인"), entry("infotext", discount, "할인"),
    entry("infoname", "예약 안내", "예약"), entry("infotext", reservation, "예약"),
  ] });
  assert.equal(routed.discount[0].value, discount);
  assert.equal(routed.reservation[0].value, reservation);
  assert.equal(detailContent(routed).notes.length, 0);
});

test("요금 안의 개인·단체·무료 조건 대괄호는 블록에 함께 보존하고 명확한 다음 항목에서만 나눈다", () => {
  const fee = "[이용요금]\n[개인] 성인 3,000원\n[단체(10인 이상)] 2,000원\n[무료 대상] 주민(신분증 지참)\n";
  const routed = routeFeeBlocks({ notes: [entry("infotext", fee + "[주차요금]\n1,000원\n[준비물]\n모자")] });
  assert.equal(routed.generalFee[0].value, fee);
  assert.equal(routed.parkingFee[0].value, "[주차요금]\n1,000원\n");
  assert.equal(routed.notes[0].value, "[준비물]\n모자");
  assert.deepEqual(routeFeeBlocks(routed), routed);
});

test("입장·셔틀 용도가 섞인 모호한 요금 블록은 입장료나 추가 요금으로 합치지 않는다", () => {
  const fee = "[이용요금]\n입장료 3,000원, 셔틀 1,000원(별도 구매)";
  const routed = routeFeeBlocks({ notes: [entry("infotext", fee)] });
  assert.equal(routed.generalFee.length, 0);
  assert.equal((routed.extraFee || []).length, 0);
  assert.equal(routed.notes[0].value, fee);
});

test("주차 필드와 반복 주차 안내만 독립 행으로 모으고 대상별 같은 가격과 혼합 문장은 보존한다", () => {
  const mixed = "주차 및 교육체험 5,000원(통합권)";
  const original = { generalFee: [entry("adultChrge", "1000"), entry("yngbgsChrge", "1000")],
    extraFee: [entry("parkingfee", "무료"), entry("etcChrgeInfo", mixed)], notes: [entry("infoname", "주차요금"), entry("infotext", "무료")] };
  const before = structuredClone(original);
  const routed = routeFeeBlocks(original);
  assert.equal(routed.parkingFee.length, 1);
  assert.equal(routed.parkingFee[0].value, "무료");
  assert.deepEqual(routed.extraFee.map(value => value.value), [mixed]);
  assert.equal(routed.generalFee.length, 2);
  assert.deepEqual(original, before);
  assert.deepEqual(routeFeeBlocks(routed), routed);
  assert.equal(routeFeeBlocks({}).parkingFee, undefined);
  assert.equal(routeFeeBlocks({ extraFee: [entry("parkingfee", "")] }).parkingFee[0].value, "");
  const ambiguous = routeFeeBlocks({ notes: [entry("infoname", "주차요금"), entry("infotext", mixed)] });
  assert.equal(ambiguous.parkingFee, undefined);
  assert.equal(ambiguous.notes[1].value, mixed);
});

test("내국인 예약 조건은 유지하고 화장실 항목 전체는 표시에서만 생략한다", () => {
  const original = {notes:[entry("infoname","내국인예약안내","예약"),entry("infotext","단체 사전 전화예약","예약"),
    entry("infoname","내국인예약안내","가능"),entry("infotext","가능","가능"),
    entry("infoname","예약안내","접수"),entry("infotext","전화 예약 가능(관람 당일 30분 전 접수 가능)","접수"),
    entry("infoname","화장실","단순"),entry("infotext","있음","단순"),
    entry("infoname","화장실","상세"),entry("infotext","있음(1층, 장애인 이용 가능)","상세")]};
  const before=structuredClone(original); const result=routeFeeBlocks(original);
  assert.deepEqual(result.reservation.map(e=>e.value),["내국인 단체 사전 전화예약","내국인 예약 안내","전화 예약 가능(관람 당일 30분 전 접수 가능)"]);
  assert.deepEqual(detailContent(result).notes,[]);
  assert.equal(result.notes.some(e=>["단순","상세"].includes(e.observationId)),false);
  assert.equal(routeFeeBlocks({notes:[entry("infoname","내국인예약안내"),entry("infotext","불가능")]}).reservation[0].value,"내국인 불가능");
  assert.deepEqual(routeFeeBlocks(result),result); assert.deepEqual(original,before);
});

test("화장실 제목으로 묶인 자료만 생략하고 다른 안내의 문구와 원본을 보존한다", () => {
  const original={notes:[entry("infotext","화장실(남녀 구분)","화장실"),entry("infoname","[화장실]","화장실"),
    entry("infoname","이용 안내","다른 안내"),entry("infotext","화장실은 별관 이용, 사전 예약 필수","다른 안내"),
    entry("infotext","제목 없는 화장실 관련 문의","제목 없음")]};
  const before=structuredClone(original);const result=routeFeeBlocks(original);
  assert.deepEqual(result.notes,original.notes.filter(e=>e.observationId!=="화장실"));
  assert.deepEqual(routeFeeBlocks(result),result);
  assert.deepEqual(original,before);
});
test("대상별 할인·무료 입장은 할인 안내로 옮기고 혼합 추가 요금·불완전 비율은 그대로 둔다", () => {
  const text="달성군민 50 할인, 미취학, 장애인, 국가유공자 등 조례에 따른 무료입장";
  const original={extraFee:[entry("etcChrgeInfo",text),entry("etcChrgeInfo","교육체험 3000원, 주민 할인","체험"),entry("etcChrgeInfo","입장료 1000원, 장애인 무료입장","혼합")]};
  const before=structuredClone(original); const result=routeFeeBlocks(original);
  assert.equal(result.discount[0].value,text); assert.equal(result.extraFee.length,2);
  assert.deepEqual(routeFeeBlocks(result),result); assert.deepEqual(original,before);
});
