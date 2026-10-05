"use client";

import { kindNames, period, permanent, outingSummary, seoulDate } from "./model";
import { Badge } from "./outing-badge";
import { OutingArtwork } from "./outing-artwork";
import { BackHeading } from "@/components/layout/back-heading";
import { EvidenceList } from "./evidence";
import { orderedHours, orderedNotes, safeUrl } from "./api-query";
import type { Detail } from "./api-types";

const groups = [
  ["hours", "운영 시간"], ["closedDays", "휴관·휴무"],
  ["generalFee", "일반 입장료 안내"], ["extraFee", "체험·추가 요금"],
  ["discount", "할인 안내"], ["reservation", "예약 안내"], ["contact", "연락처"],
] as const;
const locationGroups = [
  [["eventplace", "opar"], "행사 장소"],
  [["addr1"], "주소"], [["addr2"], "상세 주소"],
  [["rdnmadr"], "도로명 주소"], [["lnmadr"], "지번 주소"],
] as const;
export function DetailReview({ data }: { data: Detail }) {
  const item = outingSummary(data.item);
  const links = data.links.filter((link) => safeUrl(link.url));
  const locations = locationGroups.map(([fields, label]) => ({
    label, values: (data.information.address || []).filter((entry) => fields.some((field) => field === entry.field)),
  })).filter(({ values }) => values.length > 0);
  const checkedAt = data.item.sourceCheckedAt ? new Date(data.item.sourceCheckedAt) : null;
  const checkedDate = checkedAt && Number.isFinite(checkedAt.getTime()) ? seoulDate(checkedAt).replaceAll("-", ".") : null;
  const refreshNeeded = data.sources.some((source) => source.stale || source.lastFailureAt)
    || Object.values(data.information).some((entries) => entries.some((entry) => entry.stale))
    || links.some((link) => link.evidence.stale);
  return <div className="outing-detail">
    <BackHeading title="상세 정보" labelOnly />
    <div className="detail-cover"><OutingArtwork item={item} large /></div>
    <div className="detail-title">
      <div className="outing-card-meta">{item.region_name} · {kindNames[item.kind]}</div>
      <h1>{item.name}</h1>
      <div className="detail-status-meta">
        <Badge item={item} />
        {checkedDate && <p className="detail-checked">최근 자료 확인 <time dateTime={data.item.sourceCheckedAt!}>{checkedDate}</time></p>}
      </div>
    </div>
    {!permanent(item) && <dl className="detail-facts detail-period"><div><dt>행사 일정</dt><dd>{period(item)}</dd></div></dl>}
    {refreshNeeded && <p className="hint">일부 정보의 갱신이 지연되고 있어요.</p>}
    {!!data.information.description?.length && <section className="detail-section"><h2>소개</h2><EvidenceList values={data.information.description} /></section>}
    <section className="detail-section">
      <h2>이용 정보</h2>
      <dl className="detail-facts">
        <div><dt>일반 성인 입장료</dt><dd>{data.item.feeConflict ? <span className="detail-unknown">원천별 요금이 달라 확인 필요</span> : data.item.adultFee !== null && data.item.feeStatus !== "UNKNOWN" ? `${data.item.adultFee.toLocaleString("ko-KR")}원${data.item.feeStatus === "FREE" ? " · 무료" : ""}` : <span className="detail-unknown">미확인</span>}</dd></div>
        {locations.length ? locations.map(({ label, values }) => <div key={label}><dt>{label}</dt><dd><EvidenceList values={values} showLabels={false} /></dd></div>) : <div><dt>주소</dt><dd><span className="detail-unknown">미확인</span></dd></div>}
        {groups.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><EvidenceList values={key === "hours" ? orderedHours(data.information[key] || []) : data.information[key] || []} /></dd></div>)}
        <div><dt>할인 기간·증빙·중복 적용</dt><dd><span className="detail-unknown">미확인</span></dd></div>
        <div><dt>예약 기간·잔여석</dt><dd><span className="detail-unknown">미확인</span></dd></div>
      </dl>
      {!!data.information.notes?.length && <><h3>추가 안내</h3><EvidenceList values={orderedNotes(data.information.notes)} /></>}
    </section>
    <section className="detail-section">
      <h2>{links.some((link) => link.purpose === "reservation") ? "공식 안내·예약" : "공식 안내"}</h2>
      {links.map((link, index) => <div key={`${link.purpose}-${index}`}>
        <a className="source-link detail-official-link" href={safeUrl(link.url)!} target="_blank" rel="noopener noreferrer"><span><small>{link.purpose === "reservation" ? "예약 안내" : "공식 안내"}</small><strong>{link.purpose === "reservation" ? "예약 페이지 보기" : "공식 홈페이지 보기"}</strong></span><span aria-hidden="true">↗</span></a>
      </div>)}
      {!links.some((link) => link.purpose === "officialWebsite") && <p className="detail-unknown">공식 기관 안내 주소 미확인</p>}
    </section>
  </div>;
}
