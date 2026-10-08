import type { Photo, Summary } from "./api-types";

export const kindNames: Readonly<Record<string, string>> = {
  FESTIVAL: "축제",
  EVENT: "행사",
  EXHIBITION: "전시",
  MUSEUM: "박물관",
  CULTURAL_SITE: "문화관광지",
};
export type Outing = {
  id: string; name: string; kind: string; region_name: string; district_name: string | null;
  event_start: string | null; event_end: string | null; lifecycle: string;
  fee_status: string; apiPeriod?: string;
  photo?: Photo | null;
};
export function outingSummary(item: Summary): Outing {
  return {
    id: item.id, name: item.name, kind: item.kind, region_name: item.regionName,
    district_name: item.districtName, event_start: item.eventStart, event_end: item.eventEnd,
    lifecycle: item.period, fee_status: item.feeStatus,
    apiPeriod: item.period, photo: item.photo,
  };
}
export function regionLabel(region: string, district: string | null) {
  return district ? `${region} ${district}` : region;
}
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
  if (item.lifecycle === "CANCELLED") return { text: "행사 취소", className: "warning" };
  if (item.apiPeriod) {
    const labels: Record<string, { text: string; className: string }> = {
      ONGOING: { text: "행사 기간 진행 중", className: "" },
      UPCOMING: { text: "시작 예정", className: "" },
      PERMANENT: { text: "상설 시설", className: "neutral" },
      ENDED: { text: "행사 종료", className: "neutral" },
    };
    return labels[item.apiPeriod] || { text: "일정 미확인", className: "warning" };
  }
  if (item.lifecycle === "ENDED" || (item.event_end && item.event_end < today))
    return { text: "행사 종료", className: "neutral" };
  if (ongoing(item, today)) return { text: "행사 기간 진행 중", className: "" };
  if (upcoming(item, today, days)) return { text: "곧 시작", className: "" };
  return permanent(item)
    ? { text: "상설 시설", className: "neutral" }
    : { text: "일정 미확인", className: "warning" };
}
