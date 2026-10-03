import { loadLocalSettings } from "./local-settings.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { redact } from "./verify-tourapi.mjs";

// P06 표본 조회에 한정하며 전체 수집·자동 재시도는 하지 않는다.
const sources = {
  festival: {
    endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api",
    keyName: "FESTIVAL_SERVICE_KEY",
    filters: new Set(["fstvlNm", "rdnmadr", "referenceDate"]),
  },
  museum: {
    endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_museum_artgr_info_api",
    keyName: "MUSEUM_SERVICE_KEY",
    filters: new Set(["fcltyNm", "rdnmadr", "referenceDate"]),
  },
};
const fields = new Set([
  "fstvlNm", "opar", "fstvlStartDate", "fstvlEndDate", "fstvlCo",
  "mnnstNm", "auspcInsttNm", "suprtInsttNm", "homepageUrl", "relateInfo",
  "rdnmadr", "lnmadr", "referenceDate", "instt_code", "instt_nm",
  "fcltyNm", "fcltyType", "operInstitutionNm", "fcltyInfo",
  "weekdayOperOpenHhmm", "weekdayOperColseHhmm", "holidayOperOpenHhmm",
  "holidayCloseOpenHhmm", "rstdeInfo", "adultChrge", "yngbgsChrge",
  "childChrge", "etcChrgeInfo", "fcltyIntrcn", "trnsportInfo", "institutionNm",
]);

export function buildStandardUrl(sourceName, query, key, format = "json") {
  const source = sources[sourceName];
  if (!Object.hasOwn(sources, sourceName)) throw new Error("지원하지 않는 표준데이터 원천입니다.");
  if (!key || /%[0-9a-f]{2}/i.test(key)) throw new Error("해당 원천의 Decoding 인증키가 필요합니다.");
  if (!["json", "xml"].includes(format)) throw new Error("응답 형식은 json 또는 xml이어야 합니다.");
  if (!query || typeof query !== "object" || Array.isArray(query)) throw new Error("조회 조건은 JSON 객체여야 합니다.");
  const params = { numOfRows: "5", pageNo: "1", type: format };
  for (const [name, value] of Object.entries(query)) {
    if ((!source.filters.has(name) && !["numOfRows", "pageNo"].includes(name)) ||
        !["string", "number"].includes(typeof value)) throw new Error("지원하지 않는 조회 조건입니다.");
    params[name] = String(value);
  }
  if (!/^\d+$/.test(params.numOfRows) || Number(params.numOfRows) < 1 || Number(params.numOfRows) > 20 ||
      !/^\d+$/.test(params.pageNo) || !Number.isSafeInteger(Number(params.pageNo)) || Number(params.pageNo) < 1) {
    throw new Error("표본은 요청당 1~20건, 페이지는 1 이상의 정수여야 합니다.");
  }
  const url = new URL(source.endpoint);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("serviceKey", key);
  return url;
}

function countValue(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function summarizeStandardResponse(body, status, key) {
  const httpSuccess = status >= 200 && status < 300;
  let payload;
  try { payload = JSON.parse(body); } catch { /* XML 본문·오류는 코드와 건수만 확인한다. */ }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const response = payload.response ?? payload;
    const header = response.header ?? payload.OpenAPI_ServiceResponse?.cmmMsgHeader ?? response;
    const code = String(header.resultCode ?? header.returnReasonCode ?? "");
    const itemsValue = response.body?.items;
    const item = Array.isArray(itemsValue) ? itemsValue : itemsValue?.item;
    const items = Array.isArray(item) ? item : item && typeof item === "object" ? [item] : [];
    const totalCount = countValue(response.body?.totalCount);
    const rowsValid = items.every(row => row && typeof row === "object" && !Array.isArray(row));
    const itemsValid = Array.isArray(itemsValue) || itemsValue === "" ||
      (itemsValue && typeof itemsValue === "object" && Object.hasOwn(itemsValue, "item") &&
        (Array.isArray(item) || item === "" || item == null || typeof item === "object")) ||
      (totalCount === 0 && itemsValue == null);
    const success = httpSuccess && code === "00" && totalCount != null &&
      totalCount >= items.length && Boolean(itemsValid) && rowsValid;
    return {
      httpStatus: status, format: "json", resultCode: redact(code, key),
      resultMsg: redact(header.resultMsg ?? header.returnAuthMsg ?? header.errMsg ?? "", key),
      success, noData: httpSuccess && (code === "03" || (success && items.length === 0)),
      totalCount, itemCount: items.length,
      items: (rowsValid ? items : []).map(row => Object.fromEntries(Object.entries(row)
        .filter(([name]) => fields.has(name))
        .map(([name, value]) => [name, value == null ? value : redact(value, key)]))),
    };
  }
  const xmlValue = name => body.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];
  const code = xmlValue("resultCode") ?? xmlValue("returnReasonCode") ?? "";
  const itemCount = (body.match(/<item>/g) ?? []).length;
  const success = httpSuccess && code === "00" && /<body[>\s]/.test(body) && countValue(xmlValue("totalCount")) != null;
  return {
    httpStatus: status, format: body.trim().startsWith("<") ? "xml" : "unknown",
    resultCode: redact(code, key),
    resultMsg: redact(xmlValue("resultMsg") ?? xmlValue("returnAuthMsg") ?? xmlValue("errMsg") ?? "해석할 수 없는 응답", key),
    success, noData: httpSuccess && (code === "03" || (success && itemCount === 0)),
    totalCount: countValue(xmlValue("totalCount")), itemCount, items: [],
  };
}

export async function verifyStandard(sourceName, query, key, format = "json", fetchImpl = fetch) {
  const url = buildStandardUrl(sourceName, query, key, format);
  try {
    const response = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
    return { source: sourceName, checkedAt: new Date().toISOString(), ...summarizeStandardResponse(await response.text(), response.status, key) };
  } catch {
    return { source: sourceName, checkedAt: new Date().toISOString(), success: false, error: "연결 실패 또는 20초 시간 초과. 인증 여부는 확인하지 못했습니다." };
  }
}

async function main() {
  const [sourceName, queryText = "{}", format = "json"] = process.argv.slice(2);
  if (!Object.hasOwn(sources, sourceName)) throw new Error("festival 또는 museum 원천을 지정하세요.");
  const env = loadLocalSettings(fileURLToPath(new URL("..", import.meta.url)));
  const key = env[sources[sourceName].keyName]?.trim();
  const result = await verifyStandard(sourceName, JSON.parse(queryText), key, format);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success && !result.noData) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error("표준데이터 검증 실행 실패. .env의 원천별 키와 JSON 조회 조건을 확인하세요. 민감한 원본 오류는 출력하지 않습니다.");
    process.exitCode = 1;
  });
}
