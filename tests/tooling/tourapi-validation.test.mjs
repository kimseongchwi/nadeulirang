import test from "node:test";
import assert from "node:assert/strict";
import { buildUrl, redact, summarizeResponse, verify } from "../../scripts/verify-tourapi.mjs";

test("원본 키를 한 번 인코딩하고 임의 주소·조건·과다 표본을 차단한다", () => {
  const key = "검증용+/=키";
  const url = buildUrl("ldongCode2", {}, key);
  assert.equal(url.hostname, "apis.data.go.kr");
  assert.equal(url.searchParams.get("serviceKey"), key);
  assert.throws(() => buildUrl("https://example.invalid", {}, key));
  assert.throws(() => buildUrl("ldongCode2", { serviceKey: "다른키" }, key));
  assert.throws(() => buildUrl("detailImage2", { subImageYN: "Y" }, key));
  assert.throws(() => buildUrl("ldongCode2", { numOfRows: 1000 }, key));
  assert.throws(() => buildUrl("ldongCode2", { pageNo: "999999999999999999" }, key));
  assert.throws(() => buildUrl("ldongCode2", {}, encodeURIComponent(key)));
});

test("원본·인코딩·이중 인코딩 키와 서비스키 매개변수를 숨긴다", () => {
  const key = "검증용+/=키";
  const value = [key, encodeURIComponent(key), encodeURIComponent(encodeURIComponent(key)), "serviceKey=다른키&x=1"].join(" ");
  const result = redact(value, key);
  assert.ok(!result.includes(key));
  assert.ok(!result.includes(encodeURIComponent(key)));
  assert.ok(!result.includes("다른키"));
});

test("HTTP 200의 API 오류와 XML 인증 오류를 성공으로 처리하지 않는다", () => {
  const key = "검증용키";
  const json = summarizeResponse(JSON.stringify({ response: { header: { resultCode: "30", resultMsg: key } } }), 200, key);
  assert.equal(json.success, false);
  assert.equal(json.resultMsg, "[인증키 숨김]");
  const xml = summarizeResponse("<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>30</returnReasonCode><returnAuthMsg>키 오류</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>", 200, key);
  assert.equal(xml.success, false);
  assert.equal(xml.resultCode, "30");
  const gateway = summarizeResponse(JSON.stringify({ resultCode: "04", resultMsg: "HTTP_ERROR" }), 200, key);
  assert.equal(gateway.success, false);
  assert.equal(gateway.resultCode, "04");
  const echoedCount = summarizeResponse(JSON.stringify({ response: { header: { resultCode: "0000" }, body: { totalCount: key } } }), 200, key);
  assert.equal(echoedCount.totalCount, null);
  assert.ok(!JSON.stringify(echoedCount).includes(key));
});

test("빈 결과·단일 항목·0원·빈 요금을 구분하고 허용 필드만 출력한다", () => {
  const makeBody = (item) => JSON.stringify({ response: { header: { resultCode: "0000" }, body: { totalCount: item ? 1 : 0, items: item ? { item } : "" } } });
  const empty = summarizeResponse(makeBody(null), 200, "검증용키");
  assert.equal(empty.success, true);
  assert.equal(empty.itemCount, 0);
  const single = summarizeResponse(makeBody({ usefee: "0", discountinfo: "", serviceKey: "검증용키" }), 200, "검증용키");
  assert.deepEqual(single.items, [{ usefee: "0", discountinfo: "" }]);
  const codeList = summarizeResponse(makeBody({ lclsSystm1Cd: "EV", lclsSystm2Cd: "EV03", lclsSystm3Cd: "EV030100" }), 200, "검증용키");
  assert.equal(codeList.items[0].lclsSystm3Cd, "EV030100");
  assert.equal(summarizeResponse(makeBody(null), 503, "검증용키").success, false);
});

test("연결 예외에 키·URL이 있어도 원본 예외를 출력하지 않는다", async () => {
  const key = "검증용키";
  const result = await verify("ldongCode2", {}, key, "json", async () => { throw new Error(`https://example.invalid/?serviceKey=${key}`); });
  assert.equal(result.success, false);
  assert.ok(!JSON.stringify(result).includes(key));
  assert.ok(!JSON.stringify(result).includes("example.invalid"));
});

test("정상 코드만 있고 본문이 손상된 응답을 성공·빈 결과로 처리하지 않는다", () => {
  const summarize = body => summarizeResponse(JSON.stringify(body), 200, "검증용키");
  assert.equal(summarize({ resultCode: "0000" }).success, false);
  for (const item of [[null], ["손상된 항목"], "손상된 항목"]) {
    const result = summarize({ response: { header: { resultCode: "0000" }, body: { totalCount: 1, items: { item } } } });
    assert.equal(result.success, false);
    assert.deepEqual(result.items, []);
  }
  assert.equal(summarizeResponse("<header><resultCode>0000</resultCode></header>", 200, "검증용키").success, false);
});
