"use client";

import { kindNames, period, permanent, outingSummary, seoulDate } from "@/features/outings/model";
import { Badge } from "@/features/outings/outing-badge";
import { PhotoGallery } from "@/features/outings/photo-gallery";
import { BackHeading } from "@/components/layout/back-heading";
import { EvidenceList, EvidenceSources, HoursInformation, UnknownValue } from "@/features/outings/evidence";
import { detailRefreshNeeded } from "@/features/outings/detail-freshness";
import { feeAlternatives } from "@/features/outings/fee-alternatives";
import { previewLocation, safeUrl } from "@/features/outings/api-query";
import { detailContent } from "@/features/outings/detail-content";
import { routeFeeBlocks } from "@/features/outings/fee-blocks";
import { ExpandableDetailText } from "@/features/outings/expandable-detail-text";
import type { Detail } from "@/features/outings/api-types";

const groups = [
  ["hours", "운영 시간"], ["closedDays", "휴관·휴무"],
  ["generalFee", "입장료 안내"], ["extraFee", "체험·추가 요금"],
  ["parkingFee", "주차 요금"],
  ["discount", "할인 안내"], ["reservation", "예약 안내"], ["contact", "연락처"],
] as const;
const locationGroups = [
  [["eventplace", "opar"], "행사 장소"],
  [["addr1"], "주소"], [["addr2"], "상세 주소"],
  [["rdnmadr"], "도로명 주소"],
] as const;
export function DetailScreen({ data }: { data: Detail }) {
  const item = outingSummary(data.item);
  const information = routeFeeBlocks(data.information);
  const alternativeFees = feeAlternatives(data);
  const content = detailContent(information);
  const links = data.links.filter((link) => safeUrl(link.url));
  const hasRoadAddress = (data.information.address || []).some((entry) => entry.field === "rdnmadr");
  const locations = locationGroups.filter(([fields]) => !hasRoadAddress || !fields.some((field) => field === "addr1")).map(([fields, label]) => ({
    label, values: (data.information.address || []).filter((entry) => fields.some((field) => field === entry.field)),
  })).filter(({ values }) => values.length > 0);
  const checkedAt = data.item.sourceCheckedAt ? new Date(data.item.sourceCheckedAt) : null;
  const checkedDate = checkedAt && Number.isFinite(checkedAt.getTime()) ? seoulDate(checkedAt).replaceAll("-", ".") : null;
  return <div className="outing-detail">
    <BackHeading title="상세 정보" labelOnly />
    <div className="detail-cover"><PhotoGallery key={item.id} item={item} photos={data.photos} /></div>
    <div className="detail-title">
      <div className="outing-card-meta">{previewLocation(data)} · {kindNames[item.kind]}</div>
      <h1>{item.name}</h1>
      <div className="detail-status-meta">
        <Badge item={item} />
      </div>
    </div>
    {!permanent(item) && <dl className="detail-facts detail-period"><div><dt>행사 일정</dt><dd>{period(item)}</dd></div></dl>}
    {!!content.description.length && <section className="detail-section" key={item.id}>
      <h2>소개</h2>
      <ExpandableDetailText values={content.description} />
    </section>}
    <section className="detail-section">
      <h2>이용 정보</h2>
      <dl className="detail-facts">
        {locations.length ? locations.map(({ label, values }) => <div key={label}><dt>{label}</dt><dd><EvidenceList values={values} showLabels={false} /></dd></div>) : <div><dt>주소</dt><dd><UnknownValue /></dd></div>}
        {groups.filter(([key]) => !["extraFee", "discount", "reservation"].includes(key) || information[key]?.length)
          .map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === "generalFee" && alternativeFees.length > 1
            ? <div className="evidence-options">{alternativeFees.map((values, index) => <div className="evidence-entry" key={index}><span className="evidence-label">안내 {index + 1}</span><EvidenceList values={routeFeeBlocks({ generalFee: values }).generalFee || []} presentation="fee" /></div>)}</div>
            : key === "hours" ? <HoursInformation values={information[key] || []} /> : <EvidenceList values={information[key] || []} showLabels={key !== "parkingFee"} presentation={["generalFee", "extraFee", "parkingFee"].includes(key) ? "fee" : key === "closedDays" ? "closedDays" : undefined} />}
            {detailRefreshNeeded(data, key === "generalFee" && alternativeFees.length > 1 ? alternativeFees.flat() : information[key] || []) && <p className="detail-field-warning">갱신 확인이 필요한 자료예요. 방문 전 {label}을 공식 안내에서 확인해 주세요.</p>}
          </dd></div>)}
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
        <EvidenceSources values={[link.evidence]} />
        {detailRefreshNeeded(data, [link.evidence]) && <p className="detail-field-warning">갱신 확인이 필요한 안내예요.</p>}
      </div>)}
      {!links.some((link) => link.purpose === "officialWebsite") && <p className="detail-unknown">공식 기관 안내 주소 미확인</p>}
    </section>
    {checkedDate && <div className="detail-checked"><p>최근 자료 확인 <time dateTime={seoulDate(checkedAt!)}>{checkedDate}</time></p><p>원천 응답의 확인일이며, 방문일 정보는 공식 안내에서 확인해 주세요.</p></div>}
  </div>;
}
