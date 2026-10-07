import type { Detail, Evidence, Options } from "./api-types";
import { regionLabel } from "./model.ts";

const kinds = ["FESTIVAL", "EVENT", "EXHIBITION", "MUSEUM", "CULTURAL_SITE"];
const scopes: Record<string, string> = { ongoing: "ONGOING", upcoming: "UPCOMING", permanent: "PERMANENT" };
export type SearchParameters = Record<string, string | string[] | undefined>;
export function parameters(input: SearchParameters) {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) throw new Error("같은 검색 조건을 여러 번 지정할 수 없어요.");
    if (value) result.set(key, value);
  }
  return result;
}
export function queryParameters(input: URLSearchParams, options: Options | null, home = false) {
  const result = new URLSearchParams();
  const region = input.get("region")?.trim() || "";
  const resolved = options?.regions.find((r) => r.code === region || r.name === region);
  if (region) result.set("region", resolved?.code || region);
  const kind = input.get("kind") || "";
  if (kind && !kinds.includes(kind)) throw new Error("종류 검색 조건을 확인해 주세요.");
  if (kind) result.set("kind", kind);
  if (!home) {
    const keyword = input.get("q")?.trim() || "";
    if (keyword.length > 200) throw new Error("이름은 200자 이하로 입력해 주세요.");
    if (keyword) result.set("q", keyword);
    const scope = input.get("scope") || "";
    if (scope && !Object.hasOwn(scopes, scope)) throw new Error("기간 검색 조건을 확인해 주세요.");
    if (scope) result.set("scope", scope);
    const page = input.get("page") || "1";
    if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page)) || Number(page) > 2147483647)
      throw new Error("페이지 번호를 확인해 주세요.");
    if (page !== "1") result.set("page", page);
    const sort = input.get("sort") || "";
    if (sort && !["DEFAULT", "NAME", "START_DATE", "END_DATE"].includes(sort))
      throw new Error("정렬 조건을 확인해 주세요.");
    if (sort) result.set("sort", sort);
    if (scope === "upcoming") result.set("days", String(windowDays(input.get("days"))));
  }
  return result;
}
export function windowDays(value: string | null) {
  if (!value) return 14;
  if (!["7", "14", "30"].includes(value)) throw new Error("기간 구간을 확인해 주세요.");
  return Number(value);
}
export function searchFormQuery(form: URLSearchParams) {
  const input = new URLSearchParams(form);
  const scope = input.get("scope") || "";
  input.delete("page");
  input.delete("days");
  if (scope === "upcoming") input.set("days", "14");
  else if (scope === "upcoming:7" || scope === "upcoming:30") {
    input.set("scope", "upcoming");
    input.set("days", scope.split(":")[1]);
  }
  return queryParameters(input, null);
}
export function backendQuery(query: URLSearchParams) {
  const result = new URLSearchParams();
  for (const key of ["region", "kind", "page", "sort"]) {
    const value = query.get(key); if (value) result.set(key, value);
  }
  if (query.get("q")) result.set("keyword", query.get("q")!);
  const scope = query.get("scope");
  if (scope) result.set("period", scopes[scope]);
  if (scope === "upcoming") { result.set("days", query.get("days") || "14"); if (!result.has("sort")) result.set("sort", "START_DATE"); }
  if (scope === "ongoing" && !result.has("sort")) result.set("sort", "END_DATE");
  if (scope === "permanent" && !result.has("sort")) result.set("sort", "NAME");
  return result;
}
export function safeUrl(value: string) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function previewLocation(data: Detail) {
  return regionLabel(data.item.regionName, data.item.districtName);
}
function orderedEvidence(values: Evidence[], fields: readonly string[]) {
  const rows = new Map<string, Evidence[]>();
  for (const entry of values) {
    const row = rows.get(entry.observationId) || [];
    row.push(entry); rows.set(entry.observationId, row);
  }
  const rank = (field: string) => { const index = fields.indexOf(field); return index < 0 ? fields.length : index; };
  return [...rows.values()].flatMap((row) => row.toSorted((a, b) => rank(a.field) - rank(b.field)));
}
export function orderedNotes(values: Evidence[]) { return orderedEvidence(values, ["infoname", "infotext"]); }
export function orderedHours(values: Evidence[]) {
  return orderedEvidence(values, ["weekdayOperOpenHhmm", "weekdayOperColseHhmm", "holidayOperOpenHhmm", "holidayCloseOpenHhmm"]);
}
