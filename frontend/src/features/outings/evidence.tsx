import type { Evidence } from "./api-types";
import { evidenceLines, hoursInformation, type EvidencePresentation } from "./detail-information";
import { isSupplementary } from "./text-boundaries";
import { compoundFeeText, feeParts } from "./fee-presentation";
const fieldNames: Readonly<Record<string, string>> = {
  addr1: "기본 주소", addr2: "상세 주소", rdnmadr: "도로명 주소", lnmadr: "지번 주소", eventplace: "행사 장소", opar: "개최 장소",
  weekdayOperOpenHhmm: "평일 시작", weekdayOperColseHhmm: "평일 종료", holidayOperOpenHhmm: "휴일 시작", holidayCloseOpenHhmm: "휴일 종료",
  adultChrge: "성인", yngbgsChrge: "청소년", childChrge: "어린이", admissionAdult: "성인",
  phoneNumber: "시설 연락처", operPhoneNumber: "운영기관 연락처",
  parkingfee: "주차 요금", fcltyType: "시설 종류", infoname: "안내 제목", infotext: "안내 내용",
};
export function UnknownValue({ mark = "–" }: { mark?: "—" | "–" }) {
  return <span className="detail-empty"><span className="detail-empty-mark" aria-hidden="true">{mark}</span><span className="sr-only">미확인</span></span>;
}
export function EvidenceSources({ values }: { values: Evidence[] }) {
  const sources = [...new Set(values.map(({ source }) => source))];
  if (!sources.length) return null;
  return <details className="evidence-alternatives source-evidence"><summary>자료 근거</summary>
    <p>{sources.map((source) => ({ TOUR: "TourAPI", MUSEUM: "박물관 표준데이터", FESTIVAL: "축제 표준데이터" } as Readonly<Record<string, string>>)[source] || source).join(" · ")}</p>
  </details>;
}
function CompoundFeeText({ label, text }: { label: string; text: string }) {
  const formatted = compoundFeeText(label, text);
  return <span>{formatted.split(/(\d[\d,]*원)/g).map((part, index) => /^\d[\d,]*원$/.test(part) ? <strong className="fee-inline-price" key={index}>{part}</strong> : part)}</span>;
}
function EvidenceValue({ entry, presentation }: { entry: Evidence; presentation?: EvidencePresentation }) {
  if (!entry.value.trim()) return <UnknownValue />;
  if (presentation === "fee") {
    const parts = feeParts(entry).filter((part) => part.kind !== "heading" || part.text !== "[주차요금]");
    const content = <div className="fee-content">{parts.map((part, index) => part.kind === "pair"
      ? <p className="fee-pair" key={index}><span>{part.label}</span><strong>{part.price}</strong></p>
      : part.kind === "heading" ? <h3 className="fee-heading" key={index}>{part.text}</h3>
      : part.kind === "item" ? <p className="fee-item" key={index}><strong>{part.label}</strong><CompoundFeeText label={part.label} text={part.text} /></p>
      : <p className={"fee-text" + (isSupplementary(part.text) ? " evidence-note" : "")} key={index}>{part.text}</p>)}</div>;
    return parts.some((part) => part.kind === "text" && part.text.length > 160 || part.kind === "item" && part.text.length > 160)
      ? <details className="evidence-alternatives fee-details"><summary>요금 자세히</summary>{content}</details> : content;
  }
  const lines = evidenceLines(entry, presentation);
  return lines.length > 1 ? <div className="evidence-formatted">{lines.map((line, index) => <p className={"evidence-value" + (isSupplementary(line) ? " evidence-note" : "")} key={index}>{line}</p>)}</div>
    : <p className={"evidence-value" + (isSupplementary(lines[0] || "") ? " evidence-note" : "")}>{lines[0]}</p>;
}
export function HoursInformation({ values }: { values: Evidence[] }) {
  if (!values.some((entry) => entry.value.trim())) return <UnknownValue />;
  return <div className="evidence-list">{hoursInformation(values).map((row, index) => <p className="evidence-value detail-hours-row" key={index}>
    {row.label && <span className="evidence-label">{row.label}</span>}<span>{row.value.split("\n").map((line, lineIndex) => <span className={"hours-line" + (isSupplementary(line) ? " evidence-note" : "")} key={lineIndex}>{line}</span>)}</span>
  </p>)}</div>;
}
export function EvidenceList({ values, showLabels = true, presentation }: { values: Evidence[]; showLabels?: boolean; presentation?: EvidencePresentation }) {
  if (!values.some((entry) => entry.value.trim())) return <UnknownValue />;
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
    return <div className={"evidence-entry" + (presentation === "fee" && label && entries.length === 1 && /^\d[\d,]*(?:원)?$/.test(first.value.trim()) ? " fee-labeled" : "")} key={`${first.observationId}-${first.field}`}>
      {showLabels && label && <span className="evidence-label">{label}</span>}
      {entries.length === 1 ? <EvidenceValue entry={first} presentation={presentation} /> : <div className="evidence-options">
        {entries.map((entry, index) => <div className="evidence-entry" key={`${entry.observationId}-${entry.field}-${index}`}>
          <span className="evidence-label">안내 {index + 1}</span>
          <EvidenceValue entry={entry} presentation={presentation} />
        </div>)}
      </div>}
    </div>;
  })}</div>;
}
