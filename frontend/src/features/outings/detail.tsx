"use client";

import {
  dateLabel,
  kindNames,
  period,
  snapshot,
  type Outing,
} from "@/features/outings/model";
import { Badge } from "@/features/outings/outing-card";
import { BackHeading } from "@/components/layout/back-heading";

export function DetailReview({ item }: { item: Outing }) {
  return (
    <>
      <BackHeading title="나들이 상세" />
      <div className="card-meta">
        {item.region_name} · {kindNames[item.kind]}
      </div>
      <h2 style={{ margin: "12px 0" }}>{item.name}</h2>
      <Badge item={item} />
      <dl className="info-list">
        {[
          ["기간·구분", period(item)],
          ["당일 운영", "미확인"],
          ["일반 입장료", "미확인"],
          ["추가 요금", "미확인"],
          ["할인 조건", "미확인"],
          ["예약 조건", "미확인"],
        ].map(([label, value]) => (
          <div className="info-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="callout warning">
        행사 기간과 당일 운영은 달라요. 휴무·임시 휴관·예약 가능 여부는 출발
        전에 공식 안내를 확인해 주세요.
      </div>
      <section>
        <h2>데이터 출처</h2>
        <p className="section-description">
          원천 응답 확인은 현장 운영 확인과 구분해요.
        </p>
        {item.sources.map((source) => (
          <p className="small" key={source.source}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.source === "TOUR"
                ? "한국관광공사 TourAPI 데이터 안내"
                : "전국박물관미술관 표준데이터 안내"}{" "}
              ↗
            </a>
            <br />
            <span className="tiny muted">
              원천 확인 {dateLabel(source.checked.slice(0, 10))} · 수집 자료의
              원천 안내
            </span>
          </p>
        ))}
        <p className="hint">
          자료 수집·검토: {dateLabel(snapshot)} · 현재 시안은 저장 데이터의 일부
          필드만 보여줍니다. 주소·운영 시간 등은 P12·P13에서 검토 후 연결합니다.
        </p>
      </section>
    </>
  );
}
