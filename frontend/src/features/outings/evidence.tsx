import type { Evidence } from "./api-types";
import { evidenceLines, hoursInformation, type EvidencePresentation } from "./detail-information";
import { isSupplementary } from "./text-boundaries";
const fieldNames: Readonly<Record<string, string>> = {
  addr1: "기본 주소", addr2: "상세 주소", rdnmadr: "도로명 주소", lnmadr: "지번 주소", eventplace: "행사 장소", opar: "개최 장소",
  weekdayOperOpenHhmm: "평일 시작", weekdayOperColseHhmm: "평일 종료", holidayOperOpenHhmm: "휴일 시작", holidayCloseOpenHhmm: "휴일 종료",
  adultChrge: "성인", yngbgsChrge: "청소년", childChrge: "어린이", admissionAdult: "성인",
  phoneNumber: "시설 연락처", operPhoneNumber: "운영기관 연락처",
  parkingfee: "주차 요금", fcltyType: "시설 종류", infoname: "안내 제목", infotext: "안내 내용",
};
const sourceNames: Readonly<Record<string, string>> = { MUSEUM: "박물관 표준데이터", FESTIVAL: "축제 표준데이터", TOUR: "TourAPI" };
function EvidenceValue({ entry, presentation }: { entry: Evidence; presentation?: EvidencePresentation }) {
  const lines = evidenceLines(entry, presentation);
  return lines.length > 1 ? <div className="evidence-formatted">{lines.map((line, index) => <p className={"evidence-value" + (isSupplementary(line) ? " evidence-note" : "")} key={index}>{line}</p>)}</div>
    : <p className={"evidence-value" + (isSupplementary(lines[0] || "") ? " evidence-note" : "")}>{lines[0]}</p>;
}
export function HoursInformation({ values }: { values: Evidence[] }) {
  if (!values.length) return <span className="detail-unknown">미확인</span>;
  return <div className="evidence-list">{hoursInformation(values).map((row, index) => <p className="evidence-value detail-hours-row" key={index}>
    {row.label && <span className="evidence-label">{row.label}</span>}<span>{row.value.split("\n").map((line, lineIndex) => <span className={"hours-line" + (isSupplementary(line) ? " evidence-note" : "")} key={lineIndex}>{line}</span>)}</span>
  </p>)}</div>;
}
export function EvidenceList({ values, showLabels = true, presentation }: { values: Evidence[]; showLabels?: boolean; presentation?: EvidencePresentation }) {
  if (!values.length) return <span className="detail-unknown">미확인</span>;
  const groups = new Map<string, Evidence[]>();
  for (const [index, entry] of values.entries()) {
    const key = showLabels ? presentation === "fee" && ["infotext", "program", "subevent"].includes(entry.field)
      ? "" : fieldNames[entry.field] || "" : String(index);
    const entries = groups.get(key) || [];
    if (!entries.some((previous) => previous.value.replace(/\s+/g, "") === entry.value.replace(/\s+/g, ""))) entries.push(entry);
    groups.set(key, entries);
  }
  return <div className="evidence-list">{[...groups].map(([label, entries]) => {
    const first = entries[0];
    return <div className="evidence-entry" key={`${first.observationId}-${first.field}`}>
      {showLabels && label && <span className="evidence-label">{label}</span>}
      {entries.length === 1 ? <EvidenceValue entry={first} presentation={presentation} /> : <details className="evidence-alternatives">
        <summary>서로 다른 안내 {entries.length}건 · 확인 필요</summary>
        {entries.map((entry, index) => <div className="evidence-entry" key={`${entry.observationId}-${entry.field}-${index}`}>
          <span className="evidence-label">{sourceNames[entry.source] || "자료 제공처"}{entry.sourceReference && /^\d{4}-\d{2}-\d{2}$/.test(entry.sourceReference) ? ` · 기준일 ${entry.sourceReference}` : ""}</span>
          <EvidenceValue entry={entry} presentation={presentation} />
        </div>)}
      </details>}
    </div>;
  })}</div>;
}
