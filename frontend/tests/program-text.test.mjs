import assert from "node:assert/strict";
import { test } from "node:test";
import { programTextLines } from "../src/features/outings/program-text.ts";

test("목록 설명이 이어지는 짧은 번호 소제목만 강조한다", () => {
  const text = "1. 관람코스\n- 아스타 단지 : 전망대, 체험장\n- 데크로드 3.8km\n\n2. 공연프로그램 \n\n- 버스킹, 마술쇼\n\n3) 체험프로그램\n• 스탬프투어";
  const lines = programTextLines(text);
  assert.deepEqual(lines.filter((line) => line.heading).map((line) => line.text.trim()), ["1. 관람코스", "2. 공연프로그램", "3) 체험프로그램"]);
  assert.equal(lines.map((line) => line.text).join(""), text);
});

test("번호만 있는 설명·날짜·요금·긴 문장은 소제목으로 추정하지 않는다", () => {
  for (const text of [
    "1. 관람코스\n전망대와 체험장이 있습니다",
    "2026.10.07\n- 공연 날짜",
    "1. 3,000원\n- 성인 입장료",
    "1. 관람 후 이동합니다.\n- 안내",
    `1. ${"긴 설명".repeat(15)}\n- 안내`,
    "설명 : 숫자가 짧다는 이유로 제목이 되지 않습니다",
    "1. 이동합니다 : 다음 장소 안내",
  ]) assert.equal(programTextLines(text).some((line) => line.heading), false, text);
});

test("번호 콜론·명확한 항목 이름과 대괄호 제목만 강조하고 설명·일정은 본문으로 둔다", () => {
  for (const [text, expected] of [
    ["1. 메인프로그램 : 설명", "1. 메인프로그램"],
    ["1. 진남관 : 불멸의 빛으로 재현하다", "1. 진남관"],
    ["주요프로그램 : 드론 비행 상설 공연 / 특별 공연", "주요프로그램"],
    ["부대행사 : 다시 보고 싶은 베스트컷 투표 이벤트 등", "부대행사"],
    ["[이용요금]\n", "[이용요금]"],
    ["1. 상설전시 2026.06.04.~2026.12.31\n", "1. 상설전시"],
  ]) {
    const line = programTextLines(text)[0];
    assert.equal(line.headingText, expected);
    assert.equal(line.headingText + line.text.slice(line.headingText.length), text);
  }
  for (const text of ["1. 09:00", "[3,000원]", "1. 설명은 짧습니다 : 안내", "1. 관람하기 : 안내"])
    assert.equal(programTextLines(text)[0].heading, false);
});

test("줄바꿈·빈 줄·HTML처럼 보이는 원문도 삭제하거나 바꾸지 않는다", () => {
  for (const text of ["", "\r\n\r\n", "1. 관람코스\r\n- <b>체험장</b>\r\n\r\n2. 공연\r- 버스킹\r", "설명\n\n끝\n"]) {
    assert.equal(programTextLines(text).map((line) => line.text).join(""), text);
  }
});
