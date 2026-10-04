"use client";

import { dateLabel, kindNames, period, permanent, photoId, type Outing } from "@/features/outings/model";
import { Badge } from "@/features/outings/outing-card";
import { OutingArtwork, PhotoCredit } from "@/features/outings/outing-artwork";
import { BackHeading } from "@/components/layout/back-heading";
import { Icon } from "@/components/ui/icons";

export function DetailReview({ item }: { item: Outing }) {
  return (
    <div className="outing-detail">
      <BackHeading title="상세 정보" />
      <div className="detail-cover"><OutingArtwork item={item} large /></div>
      <div className="detail-title">
        <div className="outing-card-meta">{item.region_name} · {kindNames[item.kind]}</div>
        <h2>{item.name}</h2>
        <Badge item={item} />
      </div>
      {!permanent(item) && (
        <dl className="detail-facts detail-period">
          <div><dt>행사 일정</dt><dd>{period(item)}</dd></div>
        </dl>
      )}
      <section className="detail-section">
        <p className="eyebrow">방문 전에 살펴봐요</p>
        <h2>이용 정보</h2>
        <dl className="detail-facts">
          {[
            ["주소", "미확인"],
            ["운영 시간·휴관", "미확인"],
            ["일반 입장료", "미확인"],
            ["체험·추가 요금", "미확인"],
            ["할인 조건", "미확인"],
            ["예약 조건", "미확인"],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="visit-note"><Icon name="info" /><p>행사 기간과 당일 운영은 다를 수 있어요.<br />휴무·요금·예약은 출발 전에 공식 기관 안내를 확인해 주세요.</p></div>
      </section>
      <section className="detail-section detail-sources">
        <h2>출처</h2>
        {item.sources.map((source) => (
          <a className="source-link" key={source.source} href={source.url} target="_blank" rel="noopener noreferrer">
            <span><strong>{source.source === "TOUR" ? "한국관광공사 TourAPI" : "전국박물관미술관 표준데이터"}</strong><small>데이터 안내 · 자료 확인일 {dateLabel(source.checked.slice(0, 10))}</small></span><span className="external-link-mark" aria-hidden="true">↗</span>
          </a>
        ))}
        {item.id === photoId && <div id="photo-credit"><PhotoCredit /></div>}
      </section>
    </div>
  );
}
