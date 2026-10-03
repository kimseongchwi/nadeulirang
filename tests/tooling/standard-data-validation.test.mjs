import test from "node:test";
import assert from "node:assert/strict";
import { buildStandardUrl, summarizeStandardResponse, verifyStandard } from "../../scripts/verify-standard-data.mjs";

test("표준 원천과 조건·건수만 허용하고 키를 한 번 인코딩한다", () => {
  const key = "검증용+/=키";
  const url = buildStandardUrl("festival", { fstvlNm: "표본" }, key);
  assert.equal(url.hostname, "api.data.go.kr");
  assert.equal(url.searchParams.get("serviceKey"), key);
  assert.equal(url.searchParams.get("type"), "json");
  assert.throws(() => buildStandardUrl("constructor", {}, key));
  assert.throws(() => buildStandardUrl("festival", { serviceKey: "다른키" }, key));
  assert.throws(() => buildStandardUrl("museum", { fstvlNm: "표본" }, key));
  assert.throws(() => buildStandardUrl("museum", { numOfRows: 1000 }, key));
});

test("표준데이터의 00 정상 코드와 배열 항목·0원·공란을 보존한다", () => {
  const payload = { response: { header: { resultCode: "00", resultMsg: "NORMAL_CODE" }, body: { totalCount: "1", items: [{ fcltyNm: "표본", adultChrge: "0", etcChrgeInfo: "", serviceKey: "검증용키" }] } } };
  const result = summarizeStandardResponse(JSON.stringify(payload), 200, "검증용키");
  assert.equal(result.success, true);
  assert.equal(result.totalCount, 1);
  assert.deepEqual(result.items, [{ fcltyNm: "표본", adultChrge: "0", etcChrgeInfo: "" }]);
});

test("빈 결과·데이터 없음 코드와 인증·조회 실패를 구분한다", () => {
  const makeBody = code => JSON.stringify({ response: { header: { resultCode: code }, body: { totalCount: 0, items: [] } } });
  assert.equal(summarizeStandardResponse(makeBody("00"), 200, "키").noData, true);
  assert.equal(summarizeStandardResponse(makeBody("03"), 200, "키").noData, true);
  assert.equal(summarizeStandardResponse(makeBody("03"), 503, "키").noData, false);
  const error = summarizeStandardResponse("<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>30</returnReasonCode><returnAuthMsg>검증용키</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>", 200, "검증용키");
  assert.equal(error.success, false);
  assert.equal(error.noData, false);
  assert.equal(error.resultCode, "30");
  assert.ok(!JSON.stringify(error).includes("검증용키"));
  assert.equal(summarizeStandardResponse(JSON.stringify({ resultCode: "00" }), 200, "키").success, false);
  const malformed = summarizeStandardResponse(JSON.stringify({ response: { header: { resultCode: "00" }, body: { totalCount: 10, items: {} } } }), 200, "키");
  assert.equal(malformed.success, false);
  assert.equal(malformed.noData, false);
  const damagedRow = summarizeStandardResponse(JSON.stringify({ response: { header: { resultCode: "00" }, body: { totalCount: 1, items: [null] } } }), 200, "키");
  assert.equal(damagedRow.success, false);
  assert.equal(damagedRow.noData, false);
  assert.deepEqual(damagedRow.items, []);
});

test("연결 예외의 키·요청 URL을 출력하지 않는다", async () => {
  const result = await verifyStandard("museum", {}, "검증용키", "json", async () => { throw new Error("https://example.invalid/?serviceKey=검증용키"); });
  assert.equal(result.success, false);
  assert.ok(!JSON.stringify(result).includes("검증용키"));
  assert.ok(!JSON.stringify(result).includes("example.invalid"));
});
