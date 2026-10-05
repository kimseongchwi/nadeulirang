import fixture from "../outings/data/review-data.json" with { type: "json" };
import { kindNames, ongoing, permanent, upcoming, type Outing } from "../outings/model.ts";

// 가이드에서만 사용하는 수집 당시 검토 표본이다. 서비스 조회 실패를 대체하지 않는다.
export const reviewItems: readonly Outing[] = fixture;
export function publicItems(today: string) {
  return reviewItems.filter(
    (item) =>
      item.lifecycle !== "ENDED" &&
      item.lifecycle !== "CANCELLED" &&
      (!item.event_end || item.event_end >= today),
  );
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
