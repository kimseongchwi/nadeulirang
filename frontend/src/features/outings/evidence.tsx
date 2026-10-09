import type { Evidence } from "./api-types";
import { evidenceLines, hoursInformation, type EvidencePresentation } from "./detail-information";
import { isSupplementary } from "./text-boundaries";
import { displayFeeParts } from "./fee-presentation";
import { contactParts, hoursParts, serviceParts } from "./information-parts";
import { feeDisplayGroups } from "./fee-alternatives";
import { routeFeeBlocks } from "./fee-blocks";
import { addressOptions } from "./address-presentation";
const fieldNames: Readonly<Record<string, string>> = {
  adultChrge: "성인", yngbgsChrge: "청소년", childChrge: "어린이", admissionAdult: "성인",
  phoneNumber: "시설 연락처", operPhoneNumber: "운영기관 연락처",
  parkingfee: "주차 요금", fcltyType: "시설 종류",
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
function CompoundFeeText({ text }: { text: string }) {
  return <span>{text.split(/(\d[\d,]*원)/g).map((part, index) => /^\d[\d,]*원$/.test(part) ? <strong className="fee-inline-price" key={index}>{part}</strong> : part)}</span>;
}
function FeeText({ text }: { text: string }) {
  const value = text.match(/^(\+?무료|\d[\d,]*원)\s*(\([^()]+\))$/);
  if (value) return <div className="information-item"><p className={"fee-text fee-price" + (/^\+?무료$/.test(value[1]) ? " fee-free" : "")}>{value[1]}</p><p className="evidence-note">{value[2]}</p></div>;
  return <p className={"fee-text" + (isSupplementary(text) || /^[-–—]\s+\S/.test(text) ? " evidence-note" : /^\+?무료$/.test(text) ? " fee-price fee-free" : /^\d[\d,]*원$/.test(text) ? " fee-price" : "")}>{text}</p>;
}
function EvidenceValue({ entry, presentation, facilityName }: { entry: Evidence; presentation?: EvidencePresentation; facilityName?: string }) {
  if (!entry.value.trim()) return <UnknownValue />;
  if (presentation === "fee") {
    const parts = displayFeeParts(entry, facilityName).filter((part) => part.kind !== "heading" || part.text !== "[주차요금]");
    const content = <div className="fee-content">{parts.map((part, index) => part.kind === "pair"
      ? <div className="information-item" key={index}><p className="information-pair fee-pair"><span>{part.label}</span><strong className={part.price === "무료" ? "fee-free" : undefined}>{part.price}</strong></p>{part.note && <p className="evidence-note">{part.note}</p>}</div>
      : part.kind === "heading" ? <h3 className="fee-heading" key={index}>{part.text}</h3>
      : part.kind === "group" ? <div className="fee-group" role="group" aria-label={part.label} key={index}><p className="fee-text evidence-label">{part.label}</p><div className="fee-group-items">{part.items.map((item, itemIndex) => <p className="information-pair fee-pair" key={itemIndex}><span>{item.label}</span><strong className={item.price === "무료" ? "fee-free" : undefined}>{item.price}</strong></p>)}</div></div>
      : part.kind === "item" ? <div className="fee-item" key={index}><span>{part.label}</span><CompoundFeeText text={part.text} /></div>
      : <FeeText text={part.text} key={index} />)}</div>;
    return parts.some((part) => part.kind === "text" && part.text.length > 160 || part.kind === "item" && part.text.length > 160)
      ? <details className="evidence-alternatives fee-details"><summary>요금 자세히</summary>{content}</details> : content;
  }
  if (presentation === "contact") return <div className="evidence-formatted">{contactParts(entry).map((part, index) => part.kind === "pair"
    ? <p className="information-pair contact-pair" key={index}><span>{part.label}</span><span>{part.value}</span></p>
    : <p className="evidence-value" key={index}>{part.text}</p>)}</div>;
  if (presentation === "service") return <div className="evidence-formatted">{serviceParts(entry.value).map((part, index) => part.kind === "pair"
    ? <div className="information-item" key={index}><p className="information-pair"><span>{part.label}</span><span>{part.value}</span></p>{part.note && <p className="evidence-note">{part.note}</p>}</div>
    : <p className={part.kind === "note" ? "evidence-note" : "evidence-value"} key={index}>{part.text}</p>)}</div>;
  const lines = evidenceLines(entry, presentation);
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
export function AdmissionInformation({ values, alternatives = [], discount = [], facilityName }: { values: Evidence[]; alternatives?: Evidence[][]; discount?: Evidence[]; facilityName?: string }) {
  const primary = feeDisplayGroups(alternatives, discount);
  if (!primary.length) return <EvidenceList values={values} presentation="fee" facilityName={facilityName} />;
  return <div className="evidence-options">{primary.map((entries, index) => <div className="evidence-entry" key={index}>
    <EvidenceList values={routeFeeBlocks({ generalFee: entries }).generalFee || []} presentation="fee" facilityName={facilityName} />
  </div>)}</div>;
}
export function EvidenceList({ values, showLabels = true, presentation, facilityName }: { values: Evidence[]; showLabels?: boolean; presentation?: EvidencePresentation; facilityName?: string }) {
  if (!values.some((entry) => entry.value.trim())) return <UnknownValue />;
  const groups = new Map<string, Evidence[]>();
  for (const [index, entry] of values.entries()) {
    const key = showLabels ? presentation === "contact" || presentation === "fee" && ["infotext", "program", "subevent"].includes(entry.field)
      ? "" : fieldNames[entry.field] || "" : String(index);
    const entries = groups.get(key) || [];
    if (!entries.some((previous) => previous.value.replace(/\s+/g, "") === entry.value.replace(/\s+/g, ""))) entries.push(entry);
    groups.set(key, entries);
  }
  return <div className="evidence-list">{[...groups].map(([label, entries]) => {
    const first = entries[0];
    return <div className={"evidence-entry" + (presentation === "fee" && label && entries.length === 1 && /^\d[\d,]*(?:원)?$/.test(first.value.trim()) ? " fee-labeled" : "")} key={`${first.observationId}-${first.field}`}>
      {showLabels && label && <span className="evidence-label">{label}</span>}
      {entries.length === 1 ? <EvidenceValue entry={first} presentation={presentation} facilityName={facilityName} /> : <div className="evidence-options">
        {entries.map((entry, index) => <div className="evidence-entry" key={`${entry.observationId}-${entry.field}-${index}`}>
          {presentation !== "contact" && presentation !== "fee" && <span className="evidence-label">안내 {index + 1}</span>}
          <EvidenceValue entry={entry} presentation={presentation} facilityName={facilityName} />
        </div>)}
      </div>}
    </div>;
  })}</div>;
}
