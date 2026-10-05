"use client";

import { kindNames, period, permanent, photoId, outingSummary } from "./model";
import { Badge } from "./outing-badge";
import { OutingArtwork, PhotoCredit } from "./outing-artwork";
import { BackHeading } from "@/components/layout/back-heading";
import { EvidenceList, checkedTime, sourceNames } from "./evidence";
import { orderedHours, orderedNotes, safeUrl } from "./api-query";
import type { Detail } from "./api-types";

const groups = [
  ["address", "주소·장소"], ["hours", "운영 시간"], ["closedDays", "휴관·휴무"],
  ["generalFee", "일반 입장료 안내"], ["extraFee", "체험·추가 요금"],
  ["discount", "할인 안내"], ["reservation", "예약 안내"], ["contact", "연락처"],
] as const;
export function DetailReview({ data }: { data: Detail }) {
  const item = outingSummary(data.item);
  const links = data.links.filter((link) => safeUrl(link.url));
  return <div className="outing-detail">
    <BackHeading title="상세 정보" labelOnly />
    <div className="detail-cover"><OutingArtwork item={item} large /></div>
    <div className="detail-title">
      <div className="outing-card-meta">{item.region_name} · {kindNames[item.kind]}</div>
      <h1>{item.name}</h1><Badge item={item} />
    </div>
    {!permanent(item) && <dl className="detail-facts detail-period"><div><dt>행사 일정</dt><dd>{period(item)}</dd></div></dl>}
    {!!data.information.description?.length && <section className="detail-section"><h2>소개</h2><EvidenceList values={data.information.description} /></section>}
    <section className="detail-section">
      <p className="eyebrow">방문 전에 살펴봐요</p><h2>이용 정보</h2>
      <dl className="detail-facts">
        <div><dt>일반 성인 입장료</dt><dd>{data.item.feeConflict ? "원천별 요금이 달라 확인 필요" : data.item.adultFee !== null && data.item.feeStatus !== "UNKNOWN" ? `${data.item.adultFee.toLocaleString("ko-KR")}원${data.item.feeStatus === "FREE" ? " · 무료" : ""}` : "미확인"}</dd></div>
        {groups.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><EvidenceList values={key === "hours" ? orderedHours(data.information[key] || []) : data.information[key] || []} /></dd></div>)}
        <div><dt>할인 기간·증빙·중복 적용</dt><dd>미확인</dd></div>
        <div><dt>예약 기간·잔여석</dt><dd>미확인</dd></div>
      </dl>
      {!!data.information.notes?.length && <><h3>추가 안내</h3><EvidenceList values={orderedNotes(data.information.notes)} /></>}
    </section>
    <section className="detail-section">
      <h2>공식 안내·예약</h2>
      {links.map((link, index) => <div key={`${link.purpose}-${index}`}>
        <a className="source-link" href={safeUrl(link.url)!} target="_blank" rel="noopener noreferrer"><span><strong>{link.purpose === "reservation" ? "예약 안내" : "공식 기관 안내"}</strong><small>{sourceNames[link.evidence.source]} · 확인 {checkedTime(link.evidence.checkedAt)}{link.evidence.stale ? " · 갱신 확인 필요" : ""}</small></span><span aria-hidden="true">↗</span></a>
      </div>)}
      {!links.some((link) => link.purpose === "officialWebsite") && <p>공식 기관 안내 주소 미확인</p>}
      {!links.some((link) => link.purpose === "reservation") && <p>공식 예약 링크 미확인</p>}
    </section>
    <section className="detail-section detail-sources">
      <h2>출처·확인 시각</h2>
      <p className="small muted">조회 기준 {data.asOfDate} · 모든 시각은 한국 시간이에요.</p>
      {data.sources.map((source) => {
        const url = safeUrl(source.url);
        return <div className="source-record" key={`${source.source}-${source.sourceKey}`}>
          {url ? <a className="source-link" href={url} target="_blank" rel="noopener noreferrer"><strong>{sourceNames[source.source] || "원천 자료"}</strong><span aria-hidden="true">↗</span></a> : <strong>{sourceNames[source.source] || "원천 자료"}</strong>}
          <p className="small muted">데이터 안내<br />수집 {checkedTime(source.collectedAt)}<br />원천 확인 {checkedTime(source.checkedAt)}<br />이용허락 {source.license === "KOGL1_DATA" ? "공공누리 제1유형 · 데이터" : "TourAPI 데이터 이용 조건"}</p>
          {source.stale && <p className="hint">갱신 확인이 필요한 자료예요.</p>}
          {source.lastFailureAt && <p className="hint">최근 조회 실패 {checkedTime(source.lastFailureAt)} · 마지막 성공 자료를 표시해요.</p>}
        </div>;
      })}
      {item.id === photoId && <div id="photo-credit"><PhotoCredit /></div>}
    </section>
  </div>;
}
