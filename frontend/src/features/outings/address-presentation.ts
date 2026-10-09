import type { Evidence } from "./api-types";

export type AddressOption = { lines: string[]; hasAddress: boolean };
const comparable = (text: string) => text.replace(/\s+/g, "");
export function addressOptions(values: Evidence[]): AddressOption[] {
  const rows = new Map<string, Evidence[]>();
  const placeNames = new Set(values.filter((entry) => ["eventplace", "opar"].includes(entry.field)).map((entry) => comparable(entry.value)));
  for (const entry of values.filter((entry) => entry.value.trim())) {
    // 서로 다른 원천/관측의 주소와 상세 위치를 이어 붙이지 않는다.
    const key = `${entry.source}:${entry.sourceKey}:${entry.observationId}`;
    rows.set(key, [...(rows.get(key) || []), entry]);
  }
  const options: AddressOption[] = [];
  for (const row of rows.values()) {
    const unique = (fields: string[]) => [...new Set(row.filter((entry) => fields.includes(entry.field)).map((entry) => entry.value.trim()))];
    const roads = unique(["rdnmadr"]);
    const base = unique(["addr1"]);
    const addresses = roads.length ? roads : base.length ? base : unique(["lnmadr"]);
    const details = unique(["addr2"]);
    const places = unique(["eventplace", "opar"]);
    // 하나의 관측에 복수 주소가 있으면 각각의 안내로 보존한다.
    for (const address of addresses.length ? addresses : [""]) {
      const lines = [address, ...details.filter((detail) => !comparable(address).includes(comparable(detail)) && !placeNames.has(comparable(detail))),
        ...places.filter((place) => !comparable(address).includes(comparable(place))).map((place) => `행사 장소: ${place}`)].filter(Boolean);
      if (lines.length && !options.some((option) => comparable(option.lines.join("\n")) === comparable(lines.join("\n")))) options.push({ lines, hasAddress: !!address });
    }
  }
  // 같은 상세 위치/장소명만 반복한 관측은 기존 줄에 이미 있으면 생략한다.
  return options.filter((option) => option.hasAddress || !options.some((other) => other !== option && other.hasAddress
    && option.lines.every((line) => other.lines.some((existing) => comparable(existing) === comparable(line)))));
}
