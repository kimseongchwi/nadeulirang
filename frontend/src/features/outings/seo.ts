import type { Summary } from "./api-types.ts";
import { kindNames, regionLabel } from "./model.ts";

export function indexableOuting(item: Summary) {
  return ["ONGOING", "UPCOMING", "PERMANENT", "UNKNOWN"].includes(item.period);
}

export function isOutingId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function outingMetadataText(item: Summary) {
  const location = regionLabel(item.regionName, item.districtName);
  const kind = kindNames[item.kind];
  const context = [location, kind].filter(Boolean).join(" · ");
  const state = item.period === "ENDED" ? "종료된 행사" : item.period === "CANCELLED" ? "취소된 행사" : "나들이";
  return {
    title: `${item.name} · ${context} · 나들이랑`,
    description: `${location}의 ${kind || "나들이 장소"}, ${item.name}. ${state}의 일정과 요금, 이용 정보와 공식 안내를 확인하세요.`,
  };
}
