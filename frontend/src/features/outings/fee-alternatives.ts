import type { Detail, Evidence } from "./api-types";
import { feeParts } from "./fee-presentation.ts";

const admissionFields = new Set(["usefee", "usetimefestival", "adultChrge", "yngbgsChrge", "childChrge", "admissionAdult"]);
export function feeAlternatives(data: Detail): Evidence[][] {
  if (!data.item.feeConflict) return [];
  const groups = new Map<string, Evidence[]>();
  for (const entry of data.information.generalFee || []) {
    const key = `${entry.source}:${entry.sourceKey}`;
    groups.set(key, [...(groups.get(key) || []), entry]);
  }
  // API가 보존한 출처별 현재 근거 중 다른 제공처의 입장 안내만 함께 확인한다.
  // 같은 원천/필드에서는 information의 유효 선택을 우선하고 빈 응답을 가격으로 만들지 않는다.
  for (const entry of data.evidence || []) {
    if (!admissionFields.has(entry.field) || !entry.value?.trim()) continue;
    const key = `${entry.source}:${entry.sourceKey}`;
    const values = groups.get(key) || [];
    if (!values.some((previous) => previous.field === entry.field)) values.push({ ...entry, value: entry.value });
    groups.set(key, values);
  }
  return groups.size > 1 ? [...groups.values()] : [];
}

export function feeDisplayGroups(alternatives: Evidence[][], discount: Evidence[]) {
  const allFree = (values: Evidence[]) => new Set(values.map((entry) => entry.field)).size === 3 && values.length === 3 && values.every((entry) =>
    ["adultChrge", "childChrge", "yngbgsChrge"].includes(entry.field) && /^0(?:원)?$/.test(entry.value.trim()));
  const detailed = (values: Evidence[]) => values.flatMap(feeParts).filter((part) => part.kind === "pair" && /^\d[\d,]*원$/.test(part.price)).length >= 3;
  // 사용자 요청으로 상세 요금표만 표시한다. 별도 무료 자료는 DB/API에 남기며 조건부 무료로 해석하지 않는다.
  if (alternatives.length === 2 && alternatives.some(allFree) && alternatives.some(detailed)
    && discount.some((entry) => /무료\s*입장/.test(entry.value)))
    return alternatives.filter((values) => !allFree(values));
  return alternatives;
}
