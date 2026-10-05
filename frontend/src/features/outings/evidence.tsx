import type { Evidence } from "./api-types";
const fieldNames: Readonly<Record<string, string>> = {
  addr1: "기본 주소", addr2: "상세 주소", rdnmadr: "도로명 주소", lnmadr: "지번 주소", eventplace: "행사 장소", opar: "개최 장소",
  weekdayOperOpenHhmm: "평일 시작", weekdayOperColseHhmm: "평일 종료", holidayOperOpenHhmm: "휴일 시작", holidayCloseOpenHhmm: "휴일 종료",
  adultChrge: "성인 요금(원)", yngbgsChrge: "청소년 요금(원)", childChrge: "어린이 요금(원)", admissionAdult: "성인 요금(원)",
  parkingfee: "주차 요금", fcltyType: "시설 종류", infoname: "안내 제목", infotext: "안내 내용",
};
export function EvidenceList({ values, showLabels = true }: { values: Evidence[]; showLabels?: boolean }) {
  if (!values.length) return <span className="detail-unknown">미확인</span>;
  return <div className="evidence-list">{values.map((entry, index) => {
    return <div className="evidence-entry" key={`${entry.observationId}-${entry.field}-${index}`}>
      {showLabels && fieldNames[entry.field] && <span className="evidence-label">{fieldNames[entry.field]}</span>}
      <p className="evidence-value">{entry.value}</p>
    </div>;
  })}</div>;
}
