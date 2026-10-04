"use client";

import Image from "next/image";
import {
  badgeInfo,
  dateLabel,
  kindNames,
  period,
  permanent,
  photoId,
  snapshot,
  type Outing,
} from "@/features/outings/model";
import { ReviewLink, useReview } from "@/providers/review-provider";

export function Badge({ item }: { item: Outing }) {
  const { today, upcomingDays } = useReview();
  const badge = badgeInfo(item, today, upcomingDays);
  return <span className={`badge ${badge.className}`}>{badge.text}</span>;
}
export function ScopeNote() {
  const { items } = useReview();
  return (
    <p className="scope-note">
      확보 자료 · 일반 노출{" "}
      {new Set(items.map((item) => item.region_name)).size}개 시도,{" "}
      {items.length}곳<br />
      {dateLabel(snapshot)} 수집·검토 자료 · 현재 운영을 보증하지 않아요.
    </p>
  );
}
export function OutingCard({
  item,
  sample = false,
}: {
  item: Outing;
  sample?: boolean;
}) {
  const hasPhoto = item.id === photoId;
  return (
    <article className="card" data-has-photo={hasPhoto}>
      <div className="card-top">
        {hasPhoto && (
          <span className="card-thumbnail">
            <Image
              src="/images/clayarch.jpg"
              alt="클레이아크 김해미술관 외관, 2015년 사진"
              width={64}
              height={64}
              unoptimized
            />
          </span>
        )}
        <div className="card-top-info">
          <div className="card-meta">
            <span>{item.region_name}</span>
            <span>·</span>
            <span>{kindNames[item.kind]}</span>
          </div>
          <Badge item={item} />
        </div>
      </div>
      <ReviewLink className="card-heading" href={`/detail/${item.id}`}>
        <h3>{item.name}</h3>
      </ReviewLink>
      {!permanent(item) && <p className="small">{period(item)}</p>}
      <p className="hint">당일 운영·일반 입장료 미확인</p>
      {hasPhoto && (
        <p className="card-photo-credit">
          <a
            href="https://commons.wikimedia.org/wiki/File:Clayarch_Gimhae_Museum.JPG"
            target="_blank"
            rel="noopener noreferrer"
          >
            사진: HappyMidnight · 2015
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-SA 4.0
          </a>
        </p>
      )}
      <div className="card-actions">
        <span className="tiny muted">원천 확인 {dateLabel(snapshot)}</span>
        <ReviewLink className="button secondary" href={`/detail/${item.id}`}>
          자세히 보기
        </ReviewLink>
      </div>
      {sample && (
        <p className="hint">실제 확보한 카드 · 추정한 요금·운영 정보 없음</p>
      )}
    </article>
  );
}
