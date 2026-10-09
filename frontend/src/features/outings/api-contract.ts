import type { Detail, Evidence, Home, Options, Page, Photo, SourceEvidence, SourceInfo, Summary } from "./api-types";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value: Record<string, unknown>, keys: string[]) { return keys.every((key) => typeof value[key] === "string"); }
function nullable(value: Record<string, unknown>, keys: string[]) { return keys.every((key) => value[key] === null || typeof value[key] === "string"); }
function count(value: unknown) { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function arrayOf<T>(value: unknown, check: (entry: unknown) => entry is T): value is T[] { return Array.isArray(value) && value.every(check); }
export function photoUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/tong\.visitkorea\.or\.kr\/cms\/resource\/\d+\/\d+_image\d+_\d+\.(jpg|jpeg|png)$/i.test(value);
}
export function isPhoto(value: unknown): value is Photo {
  return record(value) && strings(value, ["id", "provider", "attributionUrl", "checkedAt"])
    && photoUrl(value.url) && (value.thumbnailUrl === null || photoUrl(value.thumbnailUrl))
    && value.license === "KOGL1" && value.provider === "한국관광공사 TourAPI"
    && value.attributionUrl === "https://www.data.go.kr/data/15101578/openapi.do";
}
export function isSummary(value: unknown): value is Summary {
  return record(value) && strings(value, ["id", "name", "kind", "regionCode", "regionName", "period", "feeStatus"])
    && nullable(value, ["districtName", "eventStart", "eventEnd", "collectedAt", "sourceCheckedAt"])
    && (value.adultFee === null || typeof value.adultFee === "number" && Number.isFinite(value.adultFee) && value.adultFee >= 0)
    && typeof value.feeConflict === "boolean" && typeof value.operationVerified === "boolean"
    && (value.photo === null || isPhoto(value.photo));
}
function isEvidence(value: unknown): value is Evidence {
  return record(value) && strings(value, ["field", "value", "source", "sourceKey", "url", "collectedAt", "checkedAt", "observationId"])
    && nullable(value, ["sourceReference"]) && typeof value.stale === "boolean";
}
function isSourceEvidence(value: unknown): value is SourceEvidence {
  return isEvidence(value) || record(value) && value.value === null && isEvidence({ ...value, value: "" });
}
function isSource(value: unknown): value is SourceInfo {
  return record(value) && strings(value, ["source", "sourceKey", "url", "license"])
    && nullable(value, ["collectedAt", "checkedAt", "lastFailureAt", "lastFailureCode"]) && typeof value.stale === "boolean";
}
export function isPage(value: unknown): value is Page {
  return record(value) && arrayOf(value.items, isSummary) && count(value.total) && count(value.page) && Number(value.page) > 0
    && value.pageSize === 20 && typeof value.asOfDate === "string";
}
export function isHome(value: unknown): value is Home {
  return record(value) && arrayOf(value.ongoing, isSummary) && arrayOf(value.upcoming, isSummary) && arrayOf(value.permanent, isSummary)
    && count(value.total) && typeof value.days === "number" && [7, 14, 30].includes(value.days) && typeof value.asOfDate === "string";
}
export function isOptions(value: unknown): value is Options {
  return record(value) && Array.isArray(value.regions) && value.regions.every((r: unknown) => record(r) && strings(r, ["code", "name"]) && count(r.count))
    && Array.isArray(value.kinds) && value.kinds.every((k: unknown) => record(k) && strings(k, ["code"]) && count(k.count))
    && count(value.total) && typeof value.asOfDate === "string";
}
export function isDetail(value: unknown): value is Detail {
  return record(value) && isSummary(value.item) && arrayOf(value.sources, isSource) && record(value.information)
    && arrayOf(value.photos, isPhoto)
    && new Set(value.photos.map((photo) => photo.url)).size === value.photos.length
    && (value.photos.length === 0 ? value.item.photo === null : value.item.photo?.id === value.photos[0].id && value.item.photo.url === value.photos[0].url)
    && Object.values(value.information).every((entries) => arrayOf(entries, isEvidence))
    && (value.evidence === undefined || arrayOf(value.evidence, isSourceEvidence))
    && Array.isArray(value.links) && value.links.every((link: unknown) => record(link) && strings(link, ["purpose", "url"]) && isEvidence(link.evidence))
    && Array.isArray(value.unconfirmed) && value.unconfirmed.every((entry: unknown) => typeof entry === "string") && typeof value.asOfDate === "string";
}
