import assert from "node:assert/strict";
import { test } from "node:test";
import { hoursParts, serviceInformation } from "../src/features/outings/information-parts.ts";
import { hoursInformation, evidenceLines } from "../src/features/outings/detail-information.ts";
import { addressOptions } from "../src/features/outings/address-presentation.ts";
import { feeParts } from "../src/features/outings/fee-presentation.ts";
import { programTextLines } from "../src/features/outings/program-text.ts";
const entry = (field, value, observationId = "관측", source = "TOUR") => ({ field, value, observationId, source, sourceKey: source });

test("계절별 운영 시간과 입장 마감을 같은 기간 아래에 보존한다", () => {
  const input = entry("usetime", "[1월~2월/11월~12월]09:00~17:00 (입장마감 16:00)[3월~5월/9월~10월]09:00~18:00 (입장마감 17:00)");
  const before = structuredClone(input);
  assert.deepEqual(hoursParts(hoursInformation([input])[0].value), [
    { kind: "heading", text: "[1월~2월/11월~12월]" }, { kind: "text", text: "09:00 ~ 17:00" }, { kind: "note", text: "입장마감 16:00" },
    { kind: "heading", text: "[3월~5월/9월~10월]" }, { kind: "text", text: "09:00 ~ 18:00" }, { kind: "note", text: "입장마감 17:00" },
  ]);
  assert.deepEqual(input, before);
  assert.deepEqual(hoursParts("월요일~금요일 10:00~17:00(입장 마감 16:30)"), [{ kind: "pair", label: "월요일~금요일", value: "10:00 ~ 17:00", note: "입장 마감 16:30" }]);
  assert.deepEqual(hoursParts("화~금 9:30 - 17:30 (입장 마감 17:00)"), [{ kind: "pair", label: "화~금", value: "9:30 ~ 17:30", note: "입장 마감 17:00" }]);
  assert.deepEqual(hoursParts("매표시간 09:00~17:00 관람시간 09:00~18:00"), [
    { kind: "pair", label: "매표시간", value: "09:00 ~ 17:00" }, { kind: "pair", label: "관람시간", value: "09:00 ~ 18:00" },
  ]);
});
test("모호한 시간·불완전 괄호는 추정하지 않고 단일 시간에 이름을 만들지 않는다", () => {
  for (const raw of ["[하절기 09:00~18:00", "09:00~18:00 (예약 시 가능", "문의 033-763-1534~5", "상시 개방"])
    assert.deepEqual(hoursParts(raw), [{ kind: "text", text: raw }]);
  assert.deepEqual(hoursParts("09:00~18:00 (공휴일은 10:00부터 운영)"), [{ kind: "text", text: "09:00 ~ 18:00 (공휴일은 10:00부터 운영)" }]);
  assert.deepEqual(hoursParts("09:00~18:00"), [{ kind: "text", text: "09:00 ~ 18:00" }]);
});
test("휴관의 단독 연결 문구만 생략하고 단체·단일·공휴일 예외는 유지한다", () => {
  assert.deepEqual(evidenceLines(entry("restdate", "매주 화요일 ※ 단, 공휴일 개방, 다음 평일 휴무"), "closedDays"), ["매주 화요일", "※ 공휴일 개방, 다음 평일 휴무"]);
  assert.deepEqual(evidenceLines(entry("restdate", "월요일\n※ 단\n※ 공휴일 개방"), "closedDays"), ["월요일", "※ 공휴일 개방"]);
  assert.deepEqual(evidenceLines(entry("restdate", "월요일\n※ 단\n공휴일 개방"), "closedDays"), ["월요일", "※ 공휴일 개방"]);
  for (const raw of ["※ 단체 예약 시 개방", "※ 단일 행사 제외", "월요일(단, 공휴일은 개방)", "월요일(※ 단, 공휴일은 개방)"])
    assert.deepEqual(evidenceLines(entry("restdate", raw), "closedDays"), [raw]);
});
test("같은 완결 문장 안의 대상·개인/단체만 묶고 무료·인원 조건을 보존한다", () => {
  const raw = "[오죽헌·시립박물관]- 어른 : 개인 3,000원 / 단체 2,000원- 청소년·군인 : 개인 2,000원 / 단체 1,500원- 어린이 : 개인 1,000원 / 단체 500원※ 무료 : 만65세 이상 / 강릉 시민 본인 / 만 6세 이하 미취학 아동※ 단체 : 30명 이상";
  const input = entry("usefee", raw);
  assert.deepEqual(feeParts(input).slice(0, 7), [
    { kind: "heading", text: "[오죽헌·시립박물관]" }, { kind: "heading", text: "어른" },
    { kind: "pair", label: "개인", price: "3,000원" }, { kind: "pair", label: "단체", price: "2,000원" },
    { kind: "heading", text: "청소년·군인" }, { kind: "pair", label: "개인", price: "2,000원" }, { kind: "pair", label: "단체", price: "1,500원" },
  ]);
  assert.deepEqual(feeParts(input).slice(-2), [{ kind: "text", text: "※ 무료 : 만65세 이상 / 강릉 시민 본인 / 만 6세 이하 미취학 아동" }, { kind: "text", text: "※ 단체 : 30명 이상" }]);
  assert.equal(input.value, raw);
  assert.deepEqual(feeParts(entry("usefee", "어른 : 개인 3,000원\n단체 30명 이상")), [{ kind: "heading", text: "어른" }, { kind: "pair", label: "개인", price: "3,000원" }, { kind: "text", text: "단체 30명 이상" }]);
  for (const value of ["어른 : 개인 가격 문의 / 단체 2,000원", "어른 : 개인 3,000원 / 단체 조건 문의", "입장료 1000원+체험 2000원"])
    assert.equal(feeParts(entry("usefee", value)).some(part => part.kind === "heading"), false);
});
test("차종별 기본 주차 요금과 초과 조건을 연결하고 모호한 총액은 만들지 않는다", () => {
  const raw = "[소형차] 기본 1시간 3,000원 / 초과 시 매 10분마다 800원[중·대형차] 기본 1시간 5,000원 / 초과 시 매 10분마다 800원";
  assert.deepEqual(feeParts(entry("parkingfee", raw)), [
    { kind: "pair", label: "소형차", price: "기본 1시간 3,000원", note: "초과 시 매 10분마다 800원" },
    { kind: "pair", label: "중·대형차", price: "기본 1시간 5,000원", note: "초과 시 매 10분마다 800원" },
  ]);
  assert.deepEqual(feeParts(entry("usefee", "어린이 무료(6세 이하)")), [{ kind: "pair", label: "어린이", price: "무료", note: "(6세 이하)" }]);
  assert.equal(feeParts(entry("parkingfee", "[소형차] 기본 요금 문의 / 초과 800원")).some(part => part.kind === "pair"), false);
  assert.deepEqual(feeParts(entry("parkingfee", "소형차 / 기본 1시간 3,000원 / 초과 10분당 800원")), [{ kind: "pair", label: "소형차", price: "기본 1시간 3,000원", note: "초과 10분당 800원" }]);
  assert.equal(feeParts(entry("parkingfee", "[소형차] 기본 1시간 1,50원")).some(part => part.kind === "pair"), false);
});
test("도로명 우선·기본 주소 대체·상세 중복·주소 충돌·누락을 보존한다", () => {
  assert.deepEqual(addressOptions([entry("addr1", "옛 기본 주소"), entry("rdnmadr", "도로명 주소"), entry("addr2", "3층"), entry("eventplace", "행사장")]), [{ lines: ["도로명 주소", "3층", "행사 장소: 행사장"], hasAddress: true }]);
  assert.deepEqual(addressOptions([entry("addr1", "기본 주소 3층"), entry("addr2", "3층")]), [{ lines: ["기본 주소 3층"], hasAddress: true }]);
  assert.deepEqual(addressOptions([entry("addr1", "기본 주소"), entry("lnmadr", "지번 주소")]), [{ lines: ["기본 주소"], hasAddress: true }]);
  assert.deepEqual(addressOptions([entry("lnmadr", "지번 주소")]), [{ lines: ["지번 주소"], hasAddress: true }]);
  assert.deepEqual(addressOptions([entry("rdnmadr", "주소"), entry("addr1", "주소", "별도", "MUSEUM")]), [{ lines: ["주소"], hasAddress: true }]);
  assert.deepEqual(addressOptions([entry("rdnmadr", "주소 A"), entry("addr1", "주소 B", "별도", "MUSEUM"), entry("addr2", "2층", "별도", "MUSEUM")]), [{ lines: ["주소 A"], hasAddress: true }, { lines: ["주소 B", "2층"], hasAddress: true }]);
  assert.deepEqual(addressOptions([entry("rdnmadr", "주소 A"), entry("addr2", "2층", "다른 관측")]), [{ lines: ["주소 A"], hasAddress: true }, { lines: ["2층"], hasAddress: false }]);
  assert.deepEqual(addressOptions([entry("addr1", "주소"), entry("addr2", "행사장"), entry("eventplace", "행사장", "다른 관측")]), [{ lines: ["주소"], hasAddress: true }, { lines: ["행사 장소: 행사장"], hasAddress: false }]);
  assert.deepEqual(addressOptions([entry("addr1", "")]), []);
});
test("안내서비스의 단독 가능과 요일·시간 괄호만 정리하고 의미 있는 조건을 보존한다", () => {
  assert.equal(serviceInformation("가능(화요일~일요일 10:00~17:00)※ 전화 문의 : 063-626-1330"), "화요일~일요일 10:00 ~ 17:00※ 전화 문의 : 063-626-1330");
  for (const raw of ["불가능", "예약 시 가능", "가능(단체 예약 시 유료)", "가능(화요일~일요일 10:00~17:00, 예약 필요)", "가능(화요일~일요일 10:00~17:00"])
    assert.equal(serviceInformation(raw).replaceAll(" ~ ", "~"), raw);
});
test("따옴표 번호 제목을 강조하면서 날짜·가격·일반 문장을 제목으로 넓히지 않는다", () => {
  const raw = "2. '유아, 어린이'들이 선호하는 공연 섭외\n  - 인기 캐릭터 공연, 어린이 뮤지컬";
  assert.equal(programTextLines(raw)[0].headingText, "2. '유아, 어린이'들이 선호하는 공연 섭외");
  assert.equal(programTextLines(raw).map(line => line.text).join(""), raw);
  for (const value of ["2. '무료' 3,000원\n- 안내", "2. '공연' 09:00\n- 안내", "2. '행사' 안내합니다.\n- 안내", "2. '제목'\n일반 본문"])
    assert.equal(programTextLines(value)[0].heading, false);
});
