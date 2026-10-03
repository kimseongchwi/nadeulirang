import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

// P06 표본 검증용이다. 전체 수집·재시도·사용자 위치 조회는 하지 않는다.
export const baseUrl = "https://apis.data.go.kr/B551011/KorService2/";
const operations = new Set([
  "ldongCode2", "lclsSystmCode2", "areaBasedList2", "searchKeyword2",
  "searchFestival2", "detailCommon2", "detailIntro2", "detailInfo2",
  "detailImage2", "areaBasedSyncList2",
]);
const queryNames = new Set([
  "keyword", "contentId", "contentTypeId", "eventStartDate", "eventEndDate",
  "lDongRegnCd", "lDongSignguCd", "lDongListYn", "lclsSystm1", "lclsSystm2",
  "lclsSystm3", "lclsSystmListYn", "arrange", "numOfRows", "pageNo",
  "imageYN", "showflag", "modifiedtime",
]);
const fields = new Set([
  "contentid", "contenttypeid", "title", "addr1", "addr2", "zipcode",
  "areacode", "sigungucode", "cat1", "cat2", "cat3", "lDongRegnCd",
  "lDongSignguCd", "lDongRegnNm", "lDongSignguNm", "code", "name",
  "lclsSystm1", "lclsSystm2", "lclsSystm3", "lclsSystm1Nm",
  "lclsSystm2Nm", "lclsSystm3Nm", "lclsSystm1Cd", "lclsSystm2Cd", "lclsSystm3Cd",
  "createdtime", "modifiedtime", "showflag",
  "homepage", "overview", "cpyrhtDivCd", "originimgurl", "imgname",
  "eventstartdate", "eventenddate", "playtime", "usetimefestival",
  "eventplace", "bookingplace", "eventhomepage", "agelimit", "spendtimefestival",
  "restdateculture", "usetimeculture", "usefee", "discountinfo", "spendtime",
  "restdate", "usetime", "expguide", "expagerange", "parking",
  "infoname", "infotext", "fldgubun", "serialnum",
]);

export function redact(value, key) {
  let result = String(value);
  if (key) {
    const forms = [key, encodeURIComponent(key), encodeURIComponent(encodeURIComponent(key))];
    for (const form of forms.sort((a, b) => b.length - a.length)) {
      result = result.replaceAll(form, "[인증키 숨김]");
    }
  }
  return result.replace(/serviceKey\s*[=:]\s*[^\s&<>"']+/gi, "serviceKey=[인증키 숨김]");
}

export function buildUrl(operation, query, key, format = "json") {
  if (!operations.has(operation)) throw new Error("지원하는 검증 오퍼레이션이 아닙니다.");
  if (!key || /%[0-9a-f]{2}/i.test(key)) throw new Error(".env에 Decoding 인증키를 입력하세요.");
  if (!["json", "xml"].includes(format)) throw new Error("응답 형식은 json 또는 xml이어야 합니다.");
  if (!query || typeof query !== "object" || Array.isArray(query)) throw new Error("조회 조건은 JSON 객체여야 합니다.");
  const url = new URL(operation, baseUrl);
  const params = { MobileOS: "WEB", MobileApp: "nadeulirang", _type: format, numOfRows: "5", pageNo: "1" };
  for (const [name, value] of Object.entries(query)) {
    if (!queryNames.has(name) || !["string", "number"].includes(typeof value)) {
      throw new Error("지원하지 않는 조회 조건입니다.");
    }
    params[name] = String(value);
  }
  if (!/^\d+$/.test(params.numOfRows) || Number(params.numOfRows) < 1 || Number(params.numOfRows) > 20 ||
      !/^\d+$/.test(params.pageNo) || !Number.isSafeInteger(Number(params.pageNo)) || Number(params.pageNo) < 1) {
    throw new Error("표본은 요청당 1~20건, 페이지는 1 이상이어야 합니다.");
  }
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("serviceKey", key);
  return url;
}

function xmlValue(body, name) {
  return body.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? null;
}

function countValue(value) {
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : null;
}

export function summarizeResponse(body, status, key) {
  let payload;
  try { payload = JSON.parse(body); } catch { /* XML 오류 응답도 HTTP 200일 수 있다. */ }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const response = payload.response ?? payload;
    const header = response.header ?? payload.OpenAPI_ServiceResponse?.cmmMsgHeader ?? response;
    const resultCode = String(header.resultCode ?? header.returnReasonCode ?? "");
    const itemsValue = response.body?.items;
    const item = itemsValue?.item;
    const items = Array.isArray(item) ? item : item && typeof item === "object" ? [item] : [];
    const totalCount = countValue(response.body?.totalCount);
    const rowsValid = items.every(row => row && typeof row === "object" && !Array.isArray(row));
    const itemsValid = (itemsValue === "" || (totalCount === 0 && itemsValue == null) ||
      (itemsValue && typeof itemsValue === "object" && Object.hasOwn(itemsValue, "item") &&
        (Array.isArray(item) || item === "" || item == null || typeof item === "object"))) && rowsValid;
    return {
      httpStatus: status, format: "json", resultCode: redact(resultCode, key),
      resultMsg: redact(header.resultMsg ?? header.returnAuthMsg ?? header.errMsg ?? "", key),
      success: status >= 200 && status < 300 && resultCode === "0000" &&
        totalCount != null && totalCount >= items.length && Boolean(itemsValid),
      totalCount, itemCount: items.length,
      items: (rowsValid ? items : []).map((row) => Object.fromEntries(Object.entries(row)
        .filter(([name]) => fields.has(name))
        .map(([name, value]) => [name, value == null ? value : redact(value, key)]))),
    };
  }
  const resultCode = xmlValue(body, "resultCode") ?? xmlValue(body, "returnReasonCode") ?? "";
  return {
    httpStatus: status, format: body.trim().startsWith("<") ? "xml" : "unknown",
    resultCode: redact(resultCode, key),
    resultMsg: redact(xmlValue(body, "resultMsg") ?? xmlValue(body, "returnAuthMsg") ?? xmlValue(body, "errMsg") ?? "해석할 수 없는 응답", key),
    success: status >= 200 && status < 300 && resultCode === "0000" &&
      /<body[>\s]/.test(body) && countValue(xmlValue(body, "totalCount")) != null,
    totalCount: countValue(xmlValue(body, "totalCount")), itemCount: (body.match(/<item>/g) ?? []).length,
    items: [],
  };
}

export async function verify(operation, query, key, format = "json", fetchImpl = fetch) {
  const url = buildUrl(operation, query, key, format);
  try {
    const response = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
    return { operation, checkedAt: new Date().toISOString(), ...summarizeResponse(await response.text(), response.status, key) };
  } catch {
    // 네트워크 예외·요청 URL·원본 본문은 인증키 노출을 막기 위해 출력하지 않는다.
    return { operation, checkedAt: new Date().toISOString(), success: false, error: "연결 실패 또는 20초 시간 초과. 인증 여부는 확인하지 못했습니다." };
  }
}

async function main() {
  const [operation = "ldongCode2", queryText = "{}", format = "json"] = process.argv.slice(2);
  const env = parseEnv(readFileSync(new URL("../.env", import.meta.url), "utf8"));
  const key = env.TOURAPI_SERVICE_KEY?.trim();
  const result = await verify(operation, JSON.parse(queryText), key, format);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error("검증 실행 실패. .env의 키와 오퍼레이션·JSON 조회 조건을 확인하세요. 민감한 원본 오류는 출력하지 않습니다.");
    process.exitCode = 1;
  });
}
