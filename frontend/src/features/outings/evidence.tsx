import type { Evidence } from "./api-types";
import { evidenceLines, hoursInformation, type EvidencePresentation } from "./detail-information";
import { isSupplementary } from "./text-boundaries";
import { compoundFeeText, feeParts } from "./fee-presentation";
import { hoursParts, serviceInformation } from "./information-parts";
import { addressOptions } from "./address-presentation";
const fieldNames: Readonly<Record<string, string>> = {
  adultChrge: "성인", yngbgsChrge: "청소년", childChrge: "어린이", admissionAdult: "성인",
  phoneNumber: "시설 연락처", operPhoneNumber: "운영기관 연락처",
  parkingfee: "주차 요금", fcltyType: "시설 종류", infoname: "안내 제목", infotext: "안내 내용",
};
export function UnknownValue() {
  return <span className="detail-empty"><span className="detail-empty-mark" aria-hidden="true">–</span><span className="sr-only">미확인</span></span>;
}
export function AddressInformation({ values }: { values: Evidence[] }) {
  const options = addressOptions(values);
  if (!options.length) return <UnknownValue />;
  const addresses = options.filter((option) => option.hasAddress);
  return <div className="evidence-list">{!addresses.length && <UnknownValue />}{options.map((option, index) => <div className="evidence-entry" key={index}>
    {addresses.length > 1 && option.hasAddress && <span className="evidence-label">안내 {addresses.indexOf(option) + 1}</span>}
    <p className="evidence-value">{option.lines.join("\n")}</p>
  </div>)}</div>;
}
function CompoundFeeText({ label, text }: { label: string; text: string }) {
  const formatted = compoundFeeText(label, text);
  if (formatted !== text) return <div className="compound-fee">{formatted.split("\n").map((line, index) => {
    const pair = line.match(/^(.+?)\s+(\d[\d,]*원)(\)?)$/);
    return pair ? <p className="information-pair fee-pair" key={index}><span>{pair[1]}</span><strong>{pair[2]}{pair[3]}</strong></p> : <p className="fee-text" key={index}>{line}</p>;
  })}</div>;
  return <span>{formatted.split(/(\d[\d,]*원)/g).map((part, index) => /^\d[\d,]*원$/.test(part) ? <strong className="fee-inline-price" key={index}>{part}</strong> : part)}</span>;
}
function FeeText({ text }: { text: string }) {
  const value = text.match(/^(\+?무료|\d[\d,]*원)\s*(\([^()]+\))$/);
  if (value) return <div className="information-item"><p className="fee-text fee-price">{value[1]}</p><p className="evidence-note">{value[2]}</p></div>;
  return <p className={"fee-text" + (isSupplementary(text) ? " evidence-note" : /^(?:무료|\d[\d,]*원)$/.test(text) ? " fee-price" : "")}>{text}</p>;
}
function EvidenceValue({ entry, presentation }: { entry: Evidence; presentation?: EvidencePresentation }) {
  if (!entry.value.trim()) return <UnknownValue />;
  if (presentation === "fee") {
    const parts = feeParts(entry).filter((part) => part.kind !== "heading" || part.text !== "[주차요금]");
    const content = <div className="fee-content">{parts.map((part, index) => part.kind === "pair"
      ? <div className="information-item" key={index}><p className="information-pair fee-pair"><span>{part.label}</span><strong>{part.price}</strong></p>{part.note && <p className="evidence-note">{part.note}</p>}</div>
      : part.kind === "heading" ? <h3 className="fee-heading" key={index}>{part.text}</h3>
      : part.kind === "item" ? <div className="fee-item" key={index}><strong>{part.label}</strong><CompoundFeeText label={part.label} text={part.text} /></div>
      : <FeeText text={part.text} key={index} />)}</div>;
    return parts.some((part) => part.kind === "text" && part.text.length > 160 || part.kind === "item" && part.text.length > 160)
      ? <details className="evidence-alternatives fee-details"><summary>요금 자세히</summary>{content}</details> : content;
  }
  const lines = evidenceLines(presentation === "service" ? { ...entry, value: serviceInformation(entry.value) } : entry, presentation);
  return lines.length > 1 ? <div className="evidence-formatted">{lines.map((line, index) => <p className={"evidence-value" + (isSupplementary(line) ? " evidence-note" : "")} key={index}>{line}</p>)}</div>
    : <p className={"evidence-value" + (isSupplementary(lines[0] || "") ? " evidence-note" : "")}>{lines[0]}</p>;
}
export function HoursInformation({ values }: { values: Evidence[] }) {
  if (!values.some((entry) => entry.value.trim())) return <UnknownValue />;
  return <div className="evidence-list">{hoursInformation(values).map((row, index) => <div className="evidence-entry" key={index}>
    {row.label ? <p className="information-pair"><span>{row.label}</span><span>{row.value}</span></p>
      : hoursParts(row.value).map((part, partIndex) => part.kind === "heading" ? <h3 className="information-heading" key={partIndex}>{part.text}</h3>
        : part.kind === "pair" ? <div className="information-item" key={partIndex}><p className="information-pair"><span>{part.label}</span><span>{part.value}</span></p>{part.note && <p className="evidence-note">{part.note}</p>}</div>
        : <p className={part.kind === "note" ? "evidence-note" : "evidence-value"} key={partIndex}>{part.text}</p>)}
  </div>)}</div>;
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
