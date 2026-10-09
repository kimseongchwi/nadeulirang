import type { Detail, Evidence } from "./api-types";

const comparable = (value: string) => value.replace(/\s+/g, "");
const feeComparable = (value: string) => comparable(value).replace(/^\[(?:이용요금|입장료|관람료)\]/, "");
const feeSubheading = /^(?:(?:개인|단체|일반|성인|대인|청소년|어린이|소인|유아|경로|주민|도민)(?:\s*[/·,]\s*(?:개인|단체|주민|도민))*(?:\s*[(（].*[)）])?(?:\s*(?:주민|도민|요금))?|(?:무료|할인|적용|증빙|중복|조건|예외)(?:\s*(?:대상|조건|기간|안내|요금|적용|제외))?)$/;
function feeDestination(title: string, value: string) {
  if (title === "주차요금") return /체험|입장|관람|셔틀/.test(value) ? null : "parkingFee";
  if (/^(?:체험요금|셔틀버스요금)$/.test(title)) return "extraFee";
  const admission = /(?:입장|관람)(?:료|요금|무료|\s)/.test(value) || /^(?:입장료|관람료)$/.test(title);
  const extra = /체험|주차|셔틀|특별전/.test(value);
  // 한 문장에 서로 다른 요금 용도가 섞이면 원문 안내로 남긴다.
  if (admission && extra) return null;
  return extra ? "extraFee" : "generalFee";
}
export function routeFeeBlocks(original: Detail["information"]) {
  const information = Object.fromEntries(Object.entries(original).map(([key, values]) => [key, [...values]]));
  const titles = new Map((original.notes || []).filter((entry) => entry.field === "infoname")
    .map((entry) => [entry.observationId, comparable(entry.value).replace(/^\[|\]$/g, "")]));
  const add = (entry: Evidence, value: string, group: string) => {
    const values = (information[group] || []).filter((existing) => !(group === "generalFee"
      && comparable(existing.value) === "유료" && /\d[\d,]*원/.test(value)
      && existing.source === entry.source && existing.sourceKey === entry.sourceKey));
    const scope = (field: string) => ["adultChrge", "yngbgsChrge", "childChrge", "admissionAdult"].includes(field) ? field : "";
    const compare = (text: string) => group === "parkingFee" ? feeComparable(text).replace(/^\[주차요금\]/, "") : feeComparable(text);
    if (!values.some((existing) => scope(existing.field) === scope(entry.field) && compare(existing.value) === compare(value)))
      values.push({ ...entry, value });
    information[group] = values;
  };
  // 의미가 명확한 주차 필드만 독립 행으로 옮기고 혼합 문장은 유지한다.
  for (const group of ["generalFee", "extraFee"]) {
    information[group] = (information[group] || []).filter((entry) => {
      if (entry.field !== "parkingfee") return true;
      add(entry, entry.value, "parkingFee");
      return false;
    });
  }
  // 금액 유무가 아니라 명시된 용도로 분류한다. 조건·예외는 블록 전체와 함께 이동한다.
  for (const group of ["generalFee", "notes"]) {
    information[group] = (information[group] || []).flatMap((entry) => {
      if (entry.field === "infoname") return [entry];
      const title = titles.get(entry.observationId) || "";
      if (group === "notes" && /^(?:할인안내|할인정보|예약안내|예약정보)$/.test(title)) {
        const target = title.startsWith("할인") ? "discount" : "reservation";
        const values = information[target] || [];
        if (!values.some((existing) => comparable(existing.value) === comparable(entry.value))) values.push(entry);
        information[target] = values;
        return [];
      }
      if (group === "generalFee" && /(?:셔틀|주차|체험|특별전)/.test(entry.value)
        && !/(?:입장|관람)(?:료|요금|무료|\s)/.test(entry.value)) {
        add(entry, entry.value, "extraFee");
        return [];
      }
      if (group === "notes" && /^(?:이용요금|입장료|관람료|체험요금|주차요금|셔틀버스요금)$/.test(title)) {
        const destination = feeDestination(title, entry.value);
        if (!destination) return [entry];
        add(entry, entry.value, destination);
        return [];
      }
      if (group !== "notes") return [entry];
      const text = entry.value;
      const blocks = [...text.matchAll(/^[ \t]*\[(이용요금|입장료|관람료|체험요금|주차요금|셔틀버스요금)\][ \t]*(?:\r?\n)?/gm)];
      if (!blocks.length) return [entry];
      let remaining = "";
      let cursor = 0;
      for (const block of blocks) {
        if (block.index < cursor) continue;
        remaining += text.slice(cursor, block.index);
        const start = block.index + block[0].length;
        const nextHeading = [...text.slice(start).matchAll(/^[ \t]*\[([^\]\r\n]+)\]/gm)]
          .find((heading) => !feeSubheading.test(heading[1]));
        const end = nextHeading ? start + nextHeading.index : text.length;
        const value = text.slice(block.index, end);
        const destination = feeDestination(block[1], value);
        if (text.slice(start, end).trim() && destination) add(entry, value, destination);
        else remaining += value;
        cursor = end;
      }
      remaining += text.slice(cursor);
      return remaining.trim() ? [{ ...entry, value: remaining }] : [];
    });
  }
  return information;
}
