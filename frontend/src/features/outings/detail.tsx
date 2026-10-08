"use client";

import { kindNames, period, permanent, outingSummary, seoulDate } from "./model";
import { Badge } from "./outing-badge";
import { OutingArtwork } from "./outing-artwork";
import { BackHeading } from "@/components/layout/back-heading";
import { EvidenceList, HoursInformation } from "./evidence";
import { previewLocation, safeUrl } from "./api-query";
import { detailContent } from "./detail-content";
import { routeFeeBlocks } from "./fee-blocks";
import { DetailIntroduction } from "./detail-introduction";
import { ExpandableDetailText } from "./expandable-detail-text";
import { InlineNotice } from "@/components/ui/feedback";
import type { Detail } from "./api-types";

const groups = [
  ["hours", "운영 시간"], ["closedDays", "휴관·휴무"],
  ["generalFee", "입장료 안내"], ["extraFee", "체험·추가 요금"],
  ["discount", "할인 안내"], ["reservation", "예약 안내"], ["contact", "연락처"],
] as const;
const locationGroups = [
  [["eventplace", "opar"], "행사 장소"],
  [["addr1"], "주소"], [["addr2"], "상세 주소"],
  [["rdnmadr"], "도로명 주소"],
] as const;
export function DetailReview({ data }: { data: Detail }) {
  const item = outingSummary(data.item);
  const information = routeFeeBlocks(data.information);
  const content = detailContent(information);
  const links = data.links.filter((link) => safeUrl(link.url));
  const hasRoadAddress = (data.information.address || []).some((entry) => entry.field === "rdnmadr");
  const locations = locationGroups.filter(([fields]) => !hasRoadAddress || !fields.some((field) => field === "addr1")).map(([fields, label]) => ({
    label, values: (data.information.address || []).filter((entry) => fields.some((field) => field === entry.field)),
  })).filter(({ values }) => values.length > 0);
  const checkedAt = data.item.sourceCheckedAt ? new Date(data.item.sourceCheckedAt) : null;
  const checkedDate = checkedAt && Number.isFinite(checkedAt.getTime()) ? seoulDate(checkedAt).replaceAll("-", ".") : null;
  const refreshNeeded = data.sources.some((source) => source.stale || source.lastFailureAt)
    || Object.values(data.information).some((entries) => entries.some((entry) => entry.stale))
    || data.evidence?.some((entry) => entry.stale)
    || links.some((link) => link.evidence.stale);
  return <div className="outing-detail">
    <BackHeading title="상세 정보" labelOnly />
    <div className="detail-cover"><OutingArtwork item={item} large /></div>
    <div className="detail-title">
      <div className="outing-card-meta">{previewLocation(data)} · {kindNames[item.kind]}</div>
      <h1>{item.name}</h1>
      <div className="detail-status-meta">
        <Badge item={item} />
      </div>
    </div>
    {!permanent(item) && <dl className="detail-facts detail-period"><div><dt>행사 일정</dt><dd>{period(item)}</dd></div></dl>}
    {refreshNeeded && <InlineNotice tone="warning" title="최신 정보 확인 필요">일부 정보는 최신 여부를 다시 확인해야 해요. 방문 전 공식 안내를 확인해 주세요.</InlineNotice>}
    {!!content.description.length && <DetailIntroduction key={item.id} values={content.description} />}
    <section className="detail-section">
      <h2>이용 정보</h2>
      <dl className="detail-facts">
        {locations.length ? locations.map(({ label, values }) => <div key={label}><dt>{label}</dt><dd><EvidenceList values={values} showLabels={false} /></dd></div>) : <div><dt>주소</dt><dd><span className="detail-unknown">미확인</span></dd></div>}
        {groups.filter(([key]) => !["extraFee", "discount", "reservation"].includes(key) || information[key]?.length)
          .map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === "hours" ? <HoursInformation values={information[key] || []} /> : <EvidenceList values={information[key] || []} presentation={key === "generalFee" || key === "extraFee" ? "fee" : key === "closedDays" ? "closedDays" : undefined} />}</dd></div>)}
      </dl>
    </section>
    {!!content.programs.length && <section className="detail-section">
      <h2>주요 프로그램</h2>
      <dl className="detail-facts detail-programs"><div><dt>행사 내용</dt><dd>
        <ExpandableDetailText key={item.id} values={content.programs.flatMap((note) => note.values)} emphasizeHeadings />
      </dd></div></dl>
    </section>}
    {!!content.notes.length && <section className="detail-section"><h2>추가 안내</h2>
      <dl className="detail-facts">{content.notes.map((note) => <div key={note.id}>
        <dt>{note.title || "안내 내용"}</dt>
        <dd><EvidenceList values={note.values} showLabels={false} /></dd>
      </div>)}</dl>
    </section>}
    <section className="detail-section">
      <h2>{links.some((link) => link.purpose === "reservation") ? "공식 안내·예약" : "공식 안내"}</h2>
      {links.map((link, index) => <div key={`${link.purpose}-${index}`}>
        <a className="source-link detail-official-link" href={safeUrl(link.url)!} target="_blank" rel="noopener noreferrer"><span><small>{link.purpose === "reservation" ? "예약 안내" : "공식 안내"}</small><strong>{link.purpose === "reservation" ? "예약 페이지 보기" : "공식 홈페이지 보기"}</strong></span><span aria-hidden="true">↗</span></a>
      </div>)}
      {!links.some((link) => link.purpose === "officialWebsite") && <p className="detail-unknown">공식 기관 안내 주소 미확인</p>}
    </section>
    {checkedDate && <p className="detail-checked">최근 자료 확인 <time dateTime={seoulDate(checkedAt!)}>{checkedDate}</time></p>}
  </div>;
}
