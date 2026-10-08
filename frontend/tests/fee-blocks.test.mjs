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
  assert.equal(routed.extraFee[0].value, "[주차요금]\n1,000원\n");
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
