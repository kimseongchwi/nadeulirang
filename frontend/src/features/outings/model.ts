import fixture from "./data/review-data.json" with { type: "json" };

export const kindNames: Readonly<Record<string, string>> = {
  FESTIVAL: "축제",
  EVENT: "행사",
  EXHIBITION: "전시",
  MUSEUM: "박물관",
  CULTURAL_SITE: "문화관광지",
};
export type Outing = (typeof fixture)[number];
export const reviewItems: readonly Outing[] = fixture;
export const snapshot = "2026-10-03";
export const photoId = "23e35bc8-99bf-4578-b13b-3f4ebee00d13";
export function seoulDate(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function dateLabel(value: string | null) {
  return value ? value.replaceAll("-", ".") : "날짜 선택";
}
export function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function validDate(value: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < today) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function publicItems(today: string) {
  return reviewItems.filter(
    (item) =>
      item.lifecycle !== "ENDED" &&
      item.lifecycle !== "CANCELLED" &&
      (!item.event_end || item.event_end >= today),
  );
}
export function ongoing(item: Outing, today: string) {
  return (
    !!item.event_start &&
    !!item.event_end &&
    item.event_start <= today &&
    item.event_end >= today
  );
}
export function upcoming(item: Outing, today: string, days: number) {
  return (
    !!item.event_start &&
    !!item.event_end &&
    item.event_start > today &&
    item.event_start <= addDays(today, days)
  );
}
export function permanent(item: Outing) {
  return (
    ["MUSEUM", "CULTURAL_SITE"].includes(item.kind) &&
    !item.event_start &&
    !item.event_end
  );
}
export function period(item: Outing) {
  return item.event_start && item.event_end
    ? `${dateLabel(item.event_start)} – ${dateLabel(item.event_end)}`
    : permanent(item)
      ? "상설 시설"
      : "일정 미확인";
}
export function badgeInfo(item: Outing, today: string, days: number) {
  if (item.lifecycle === "ENDED" || (item.event_end && item.event_end < today))
    return { text: "행사 종료", className: "neutral" };
  if (ongoing(item, today)) return { text: "행사 기간 진행 중", className: "" };
  if (upcoming(item, today, days)) return { text: "곧 시작", className: "" };
  return permanent(item)
    ? { text: "상설 시설", className: "neutral" }
    : { text: "일정 미확인", className: "warning" };
}
export function normalizedFilters(
  params: URLSearchParams,
  today: string,
  home = false,
) {
  const next = new URLSearchParams();
  const region = params.get("region") || "";
  const kind = params.get("kind") || "";
  const query = params.get("q")?.trim();
  if (!home && query) next.set("q", query);
  if (publicItems(today).some((item) => item.region_name === region))
    next.set("region", region);
  if (Object.hasOwn(kindNames, kind)) next.set("kind", kind);
  const scope = params.get("scope") || "";
  if (!home && ["ongoing", "upcoming", "permanent"].includes(scope))
    next.set("scope", scope);
  return next;
}
export function searchItems(
  params: URLSearchParams,
  today: string,
  days: number,
) {
  const query = (params.get("q") || "").trim().toLocaleLowerCase("ko");
  const region = params.get("region");
  const kind = params.get("kind");
  const scope = params.get("scope");
  const items = publicItems(today).filter(
    (item) =>
      item.name.toLocaleLowerCase("ko").includes(query) &&
      (!region || item.region_name === region) &&
      (!kind || item.kind === kind),
  );
  const filtered = items.filter((item) =>
    scope === "ongoing"
      ? ongoing(item, today)
      : scope === "upcoming"
        ? upcoming(item, today, days)
        : scope === "permanent"
          ? permanent(item)
          : true,
  );
  const tier = (item: Outing) =>
    item.event_start ? 0 : permanent(item) ? 1 : 2;
  return filtered.sort(
    (a, b) =>
      tier(a) - tier(b) ||
      (tier(a) === 0
        ? (a.event_start || "").localeCompare(b.event_start || "")
        : a.name.localeCompare(b.name, "ko")) ||
      a.id.localeCompare(b.id),
  );
}
