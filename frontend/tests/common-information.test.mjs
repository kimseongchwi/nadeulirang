import assert from "node:assert/strict";
import { test } from "node:test";
import { contactParts, hoursParts, serviceInformation, serviceParts } from "../src/features/outings/information-parts.ts";
import { hoursInformation, evidenceLines } from "../src/features/outings/detail-information.ts";
import { addressOptions } from "../src/features/outings/address-presentation.ts";
import { displayFeeParts, feeParts } from "../src/features/outings/fee-presentation.ts";
import { programTextLines } from "../src/features/outings/program-text.ts";
const entry = (field, value, observationId = "관측", source = "TOUR") => ({ field, value, observationId, source, sourceKey: source });

test("계절별 운영 시간과 입장 마감을 같은 기간 아래에 보존한다", () => {
  const input = entry("usetime", "[1월~2월/11월~12월]09:00~17:00 (입장마감 16:00)[3월~5월/9월~10월]09:00~18:00 (입장마감 17:00)");
  const before = structuredClone(input);
  assert.deepEqual(hoursParts(hoursInformation([input])[0].value), [
    { kind: "pair", label: "1월~2월/11월~12월", value: "09:00 ~ 17:00", note: "입장마감 16:00" },
    { kind: "pair", label: "3월~5월/9월~10월", value: "09:00 ~ 18:00", note: "입장마감 17:00" },
  ]);
  assert.deepEqual(input, before);
  assert.deepEqual(hoursParts("월요일~금요일 10:00~17:00(입장 마감 16:30)"), [{ kind: "pair", label: "월요일~금요일", value: "10:00 ~ 17:00", note: "입장 마감 16:30" }]);
  assert.deepEqual(hoursParts("화~금 9:30 - 17:30 (입장 마감 17:00)"), [{ kind: "pair", label: "화~금", value: "9:30 ~ 17:30", note: "입장 마감 17:00" }]);
  assert.deepEqual(hoursParts("매표시간 09:00~17:00 관람시간 09:00~18:00"), [
    { kind: "pair", label: "매표시간", value: "09:00 ~ 17:00" }, { kind: "pair", label: "관람시간", value: "09:00 ~ 18:00" },
  ]);
});
test("계절 시간은 좌우 행으로 표시하되 불명확한 제목·시간 관계는 보존한다", () => {
  for (const raw of ["[하절기(3~10월)]- 09:00~18:00[동절기(11~2월)]- 09:00~17:00", "- 하절기(3~10월) 09:00~18:00- 동절기(11~2월) 09:00~17:00"])
    assert.deepEqual(hoursParts(hoursInformation([entry("usetimeculture", raw)])[0].value), [
      {kind:"pair",label:"하절기(3~10월)",value:"09:00 ~ 18:00"}, {kind:"pair",label:"동절기(11~2월)",value:"09:00 ~ 17:00"},
    ]);
  assert.deepEqual(hoursParts("[특별 행사]\n09:00~18:00"), [{kind:"heading",text:"[특별 행사]"},{kind:"text",text:"09:00 ~ 18:00"}]);
  assert.deepEqual(hoursParts("[6월~8월]\n시간 문의"), [{kind:"heading",text:"[6월~8월]"},{kind:"text",text:"시간 문의"}]);
});
test("계절별 회차 시각 목록은 좌우 행으로 배치하고 범위·변경 조건은 추정하지 않는다", () => {
  const raw = "- 하절기(3월~9월) 20:00, 22:00- 동절기(10월~2월) 19:00, 21:00";
  const input = entry("playtime", raw); const before = structuredClone(input);
  assert.deepEqual(hoursParts(hoursInformation([input])[0].value), [
    { kind: "pair", label: "하절기(3월~9월)", value: "20:00, 22:00" },
    { kind: "pair", label: "동절기(10월~2월)", value: "19:00, 21:00" },
  ]);
  assert.deepEqual(input, before);
  assert.deepEqual(hoursParts("하절기(3월~9월): 20:00"), [{ kind: "pair", label: "하절기(3월~9월)", value: "20:00" }]);
  for (const text of ["하절기(3월~9월): 20:00, 22:00(예약 시 변경)", "하절기(3월~9월): 20:00, 문의 필요", "20:00, 22:00"])
    assert.deepEqual(hoursParts(text), [{ kind: "text", text }]);
});
test("관람의 월별 시간과 단일 체험시간을 나누고 각 입장 제한을 유지한다", () => {
  const raw = "[관람시간]<br>\n- 3월~11월 10:00~18:00<br>\n- 12월~2월 10:00~17:00<br>\n※ 관람 시 종료 40분 전까지 입장<br>\n[체험시간]<br>\n- 10:00~16:00<br>\n※ 체험 시 종료 1시간 전까지 입장";
  const input = entry("usetimeculture", raw); const before = structuredClone(input);
  assert.deepEqual(hoursParts(hoursInformation([input])[0].value), [
    { kind: "heading", text: "[관람시간]" },
    { kind: "pair", label: "3월~11월", value: "10:00 ~ 18:00" },
    { kind: "pair", label: "12월~2월", value: "10:00 ~ 17:00" },
    { kind: "note", text: "※ 관람 시 종료 40분 전까지 입장" },
    { kind: "pair", label: "체험시간", value: "10:00 ~ 16:00" },
    { kind: "note", text: "※ 체험 시 종료 1시간 전까지 입장" },
  ]);
  assert.deepEqual(input, before);
  assert.deepEqual(hoursParts("- 3월~11월 10:00~18:00(예약 시 변경)"), [{ kind: "text", text: "3월~11월 10:00 ~ 18:00(예약 시 변경)" }]);
  assert.deepEqual(hoursParts("3월~11월 시간 문의"), [{ kind: "text", text: "3월~11월 시간 문의" }]);
});
test("휴무 슬래시의 별도 항목만 줄로 나누고 요일 범위·줄임말·괄호 예외·문의는 유지한다", () => {
  for (const [raw, expected] of [
    ["매주 토요일~일요일 / 법정 공휴일", ["매주 토요일~일요일", "법정 공휴일"]],
    ["매주 월요일 / 1월1일 / 설·추석 연휴 / 국경일 / 정부지정 공휴일", ["매주 월요일", "1월 1일", "설·추석 연휴", "국경일", "정부지정 공휴일"]],
    ["1월 1일 / 설·추석 연휴", ["1월 1일", "설·추석 연휴"]],
  ]) assert.deepEqual(evidenceLines(entry("restdateculture", raw), "closedDays"), expected);
  for (const raw of ["월/화요일", "매월 둘째/넷째 금요일", "연중무휴(1월 1일/설날/추석 당일은 실내 휴관)", "※ 법정 공휴일/설날은 예약 시 개방", "2026/10/01 휴관"])
    assert.deepEqual(evidenceLines(entry("restdateculture", raw), "closedDays"), [raw]);
});
test("붙은 기관·전화는 명시된 번호로 나누고 내선·조건·번호 범위를 잃지 않는다", () => {
  const raw = "거제시청 농업정책과 055-639-6311거제시농업개발원 0507-1344-6421";
  assert.deepEqual(contactParts(entry("infocenterculture", raw)), [{kind:"pair",label:"거제시청 농업정책과",value:"055-639-6311"},{kind:"pair",label:"거제시농업개발원",value:"0507-1344-6421"}]);
  assert.deepEqual(contactParts(entry("phoneNumber", "053-668-2796")), [{kind:"pair",label:"시설 연락처",value:"053-668-2796"}]);
  assert.deepEqual(contactParts(entry("operPhoneNumber", "053-659-4900")), [{kind:"pair",label:"운영기관 연락처",value:"053-659-4900"}]);
  assert.deepEqual(contactParts(entry("infocenterculture", "033-660-3301~8")), [{kind:"text",text:"033-660-3301~8"}]);
  for (const value of ["문의 02-123-4567(내선 10)", "주말(예약 시) 02-123-4567", "안내 1 02-123-4567", "전화 문의"])
    assert.deepEqual(contactParts(entry("tel",value)), [{kind:"text",text:value}]);
});
test("상세 제목과 반복되는 첫 시설 제목만 생략하고 대상·다른 시설·조건은 보존한다", () => {
  const input = entry("usefee", "[오죽헌·시립박물관]- 어른 : 개인 3,000원 / 단체 2,000원※ 단체 : 30명 이상");
  assert.deepEqual(displayFeeParts(input,"강릉 오죽헌·시립박물관"),feeParts(input).slice(1));
  assert.deepEqual(displayFeeParts(input,"다른 박물관"),feeParts(input));
  const target = entry("usefee", "[단체(10인 이상)] 성인 3,000원");
  assert.deepEqual(displayFeeParts(target,"오죽헌·시립박물관"),feeParts(target));
  assert.match(input.value,/^\[오죽헌·시립박물관\]/);
});
test("모호한 시간·불완전 괄호는 추정하지 않고 단일 시간에 이름을 만들지 않는다", () => {
  for (const raw of ["[하절기 09:00~18:00", "09:00~18:00 (예약 시 가능", "문의 033-763-1534~5", "상시 개방"])
    assert.deepEqual(hoursParts(raw), [{ kind: "text", text: raw }]);
  assert.deepEqual(hoursParts("09:00~18:00 (공휴일은 10:00부터 운영)"), [{ kind: "text", text: "09:00 ~ 18:00 (공휴일은 10:00부터 운영)" }]);
  assert.deepEqual(hoursParts("09:00~18:00"), [{ kind: "text", text: "09:00 ~ 18:00" }]);
});

test("1부·2부의 명시된 시간만 회차별 행으로 연결하고 원문과 혼합 안내를 보존한다", () => {
  const input = entry("usetimefestival", "1부 - 18:20~20:10 / 2부 - 19:30~21:20");
  const before = structuredClone(input);
  const expected = [{ kind: "pair", label: "1부", value: "18:20 ~ 20:10" }, { kind: "pair", label: "2부", value: "19:30 ~ 21:20" }];
  assert.deepEqual(hoursParts(hoursInformation([input])[0].value), expected);
  assert.deepEqual(hoursParts(input.value), expected);
  assert.deepEqual(input, before);
  assert.deepEqual(hoursParts("1부 18:20~20:10 (입장 마감 18:00)\n2부 19:30~21:20"), [{ ...expected[0], note: "입장 마감 18:00" }, expected[1]]);
  for (const value of ["1부 준비 / 2부 공연", "1부 18:20~20:10 / 문의 02-123-4567", "1부 18:20~20:10 (예약 시 변경)"])
    assert.deepEqual(hoursParts(value), [{ kind: "text", text: value.replace(/(\d{1,2}:\d{2})~(\d{1,2}:\d{2})/g, "$1 ~ $2") }]);
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
test("안내서비스의 가능·바깥 괄호만 정리하고 언어·중첩 괄호·예약·유료·문의 조건을 보존한다", () => {
  assert.equal(serviceInformation("가능(화요일~일요일 10:00~17:00)※ 전화 문의 : 063-626-1330"), "화요일~일요일 10:00 ~ 17:00※ 전화 문의 : 063-626-1330");
  assert.equal(serviceInformation("가능(단체 예약 시 유료)"), "단체 예약 시 유료");
  assert.equal(serviceInformation("가능(화요일~일요일 10:00~17:00, 예약 필요)"), "화요일~일요일 10:00 ~ 17:00, 예약 필요");
  assert.equal(serviceInformation("가능(문화관광해설)"), "문화관광해설");
  assert.equal(serviceInformation("가능(한국어)영어는 예약 필요"), "한국어 영어는 예약 필요");
  assert.equal(serviceInformation("가능(한국어, 영어(사전 예약), 단체 유료)※ 전화 문의 : 063-626-1330"), "한국어, 영어(사전 예약), 단체 유료※ 전화 문의 : 063-626-1330");
  assert.equal(serviceInformation(" 가능（한국어, 영어（예약 필요））"), "한국어, 영어（예약 필요）");
  for (const raw of ["가능", "가능()", "불가능", "예약 시 가능", "전화 예약 가능(관람 당일 30분 전 접수 가능)", "가능(화요일~일요일 10:00~17:00", "가능(한국어（예약 필요))"])
    assert.equal(serviceInformation(raw).replaceAll(" ~ ", "~"), raw);
});
test("안내서비스의 명시된 요일·시간을 나누고 뒤의 문의를 보존한다", () => {
  const raw = "가능(화요일~일요일 10:00~17:00)※ 전화 문의 : 063-626-1330";
  assert.deepEqual(serviceParts(raw), [
    { kind: "pair", label: "화요일~일요일", value: "10:00 ~ 17:00" },
    { kind: "note", text: "※ 전화 문의 : 063-626-1330" },
  ]);
  assert.deepEqual(serviceParts("가능(화요일~일요일 10:00~17:00)<br />※ 전화 문의 : 063-626-1330"), serviceParts(raw));
  assert.deepEqual(serviceParts("화~금 9:30~17:30(입장 마감 17:00)"), [
    { kind: "pair", label: "화~금", value: "9:30 ~ 17:30", note: "입장 마감 17:00" },
  ]);
});
test("서비스의 언어·예약·유료·불완전 조건을 시간 쌍으로 추정하지 않는다", () => {
  for (const raw of ["가능(화요일~일요일 10:00~17:00, 예약 필요)", "가능(한국어, 영어(사전 예약), 단체 유료)", "가능(화요일~일요일 10:00~17:00", "화요일~일요일 10:00~17:00(단체 유료)", "한국어 10:00~17:00"])
    assert.deepEqual(serviceParts(raw), [{ kind: "text", text: serviceInformation(raw) }]);
  assert.deepEqual(serviceParts("가능(한국어, 영어(사전 예약), 단체 유료)※ 문의 063-626-1330"), [
    { kind: "text", text: "한국어, 영어(사전 예약), 단체 유료" }, { kind: "note", text: "※ 문의 063-626-1330" },
  ]);
});
test("따옴표 번호 제목을 강조하면서 날짜·가격·일반 문장을 제목으로 넓히지 않는다", () => {
  const raw = "2. '유아, 어린이'들이 선호하는 공연 섭외\n  - 인기 캐릭터 공연, 어린이 뮤지컬";
  assert.equal(programTextLines(raw)[0].headingText, "2. '유아, 어린이'들이 선호하는 공연 섭외");
  assert.equal(programTextLines(raw).map(line => line.text).join(""), raw);
  for (const value of ["2. '무료' 3,000원\n- 안내", "2. '공연' 09:00\n- 안내", "2. '행사' 안내합니다.\n- 안내", "2. '제목'\n일반 본문"])
    assert.equal(programTextLines(value)[0].heading, false);
});
