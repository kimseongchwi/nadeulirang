"use client";

import { badgeInfo, kindNames, period, permanent, type Outing } from "@/features/outings/model";
import { useReview } from "@/providers/review-provider";
import { Icon } from "@/components/ui/icons";
import { OutingArtwork } from "@/features/outings/outing-artwork";

export function Badge({ item }: { item: Outing }) {
  const { today, upcomingDays } = useReview();
  const badge = badgeInfo(item, today, upcomingDays);
  return <span className={`badge ${badge.className}`}>{badge.text}</span>;
}
export function OutingCard({ item, sample = false }: { item: Outing; sample?: boolean }) {
  const { openSheet } = useReview();
  return (
    <article className="outing-card">
      <button type="button" className="outing-card-open" aria-label={`${item.name} 간단 보기`} aria-haspopup="dialog" onClick={() => openSheet(`#outing-${item.id}`)}>
        <OutingArtwork item={item} />
        <span className="outing-card-content">
          <span className="outing-card-meta">{item.region_name} <span>·</span> {kindNames[item.kind]}</span>
          <span className="outing-card-name">{item.name}</span>
          <span className="outing-card-period">{permanent(item) ? "상설 · 운영일 확인 필요" : period(item)}</span>
          <span className="outing-card-bottom"><Badge item={item} /><span className="outing-card-arrow"><Icon name="next" /></span></span>
        </span>
      </button>
      {sample && <span className="sr-only">실제 확보한 자료의 검토용 카드</span>}
    </article>
  );
}
