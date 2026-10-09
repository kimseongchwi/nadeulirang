import type { Detail, Evidence } from "./api-types";

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
