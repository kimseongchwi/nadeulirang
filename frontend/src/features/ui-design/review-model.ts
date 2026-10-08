import fixture from "./data/review-data.json" with { type: "json" };
import { type Outing } from "../outings/model.ts";

// 가이드에서만 사용하는 수집 당시 검토 표본이다. 서비스 조회 실패를 대체하지 않는다.
const reviewItems: readonly Outing[] = fixture;
export function publicItems(today: string) {
  return reviewItems.filter(
    (item) =>
      item.lifecycle !== "ENDED" &&
      item.lifecycle !== "CANCELLED" &&
      (!item.event_end || item.event_end >= today),
  );
}
