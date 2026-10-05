import type { Evidence } from "./api-types";
import { safeUrl } from "./api-query";

export const sourceNames: Readonly<Record<string, string>> = {
  TOUR: "한국관광공사 TourAPI", MUSEUM: "전국박물관미술관 표준데이터", FESTIVAL: "전국문화축제 표준데이터",
};
const fieldNames: Readonly<Record<string, string>> = {
  addr1: "기본 주소", addr2: "상세 주소", rdnmadr: "도로명 주소", lnmadr: "지번 주소", eventplace: "행사 장소", opar: "개최 장소",
  weekdayOperOpenHhmm: "평일 시작", weekdayOperColseHhmm: "평일 종료", holidayOperOpenHhmm: "휴일 시작", holidayCloseOpenHhmm: "휴일 종료",
  adultChrge: "성인 요금(원)", yngbgsChrge: "청소년 요금(원)", childChrge: "어린이 요금(원)", admissionAdult: "성인 요금(원)",
  parkingfee: "주차 요금", fcltyType: "시설 종류", infoname: "안내 제목", infotext: "안내 내용",
};
export function checkedTime(value: string | null) {
  if (!value) return "미확인";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date) : "미확인";
}
function referenceLabel(value: string) {
  if (/^\d{14}$/.test(value)) return `원천 수정 ${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
  return `원천 기준 ${value}`;
}
export function EvidenceList({ values }: { values: Evidence[] }) {
  if (!values.length) return <>미확인</>;
  return <div className="evidence-list">{values.map((entry, index) => {
    const url = safeUrl(entry.url);
    return <div className="evidence-entry" key={`${entry.observationId}-${entry.field}-${index}`}>
      {fieldNames[entry.field] && <strong className="evidence-label">{fieldNames[entry.field]}</strong>}
      <p className="evidence-value">{entry.value}</p>
      <small className="evidence-source">{url ? <a href={url} target="_blank" rel="noopener noreferrer">{sourceNames[entry.source] || "원천 자료"}</a> : sourceNames[entry.source] || "원천 자료"}
        {entry.sourceReference ? ` · ${referenceLabel(entry.sourceReference)}` : ""} · 확인 {checkedTime(entry.checkedAt)}
        {entry.stale && <span className="evidence-stale"> · 갱신 확인 필요</span>}
      </small>
    </div>;
  })}</div>;
}
