import type { Evidence } from "./api-types";
import { formatSeasonalHours } from "./seasonal-hours.ts";
import { informationLines } from "./text-boundaries.ts";

export type EvidencePresentation = "fee" | "closedDays" | "service" | "contact";
const feeFields = new Set(["adultChrge", "yngbgsChrge", "childChrge", "admissionAdult"]);
function money(value: string) {
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:원)?$/.test(value)) return value;
  const amount = Number(value.replaceAll(",", "").replace(/원$/, ""));
  if (!Number.isSafeInteger(amount)) return value;
  return amount === 0 ? "무료" : `${amount.toLocaleString("ko-KR")}원`;
}
export function evidenceLines(entry: Pick<Evidence, "field" | "value">, presentation?: EvidencePresentation) {
  const value = entry.value.replace(/<br\s*\/?>/gi, "\n");
  if (presentation === "fee") {
    if (feeFields.has(entry.field) || /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:원)?$/.test(value.trim())) return [money(value.trim())];
    return informationLines(value, "fee")
      .map((line) => {
        const match = line.trim().match(/^((?:일반|단체|달성군민|지역주민|주민)?\s*(?:성인|어린이|청소년|유아|경로)(?:\s*[,·]\s*(?:성인|어린이|청소년|유아|경로))*)\s*(\d[\d,]*)\s*(?:원)?$/);
        return match ? `${match[1].trim()} ${money(match[2])}` : line.trim();
      }).filter(Boolean);
  }
  if (presentation === "closedDays") {
    let followingException = false;
    return informationLines(value, "closedDays").flatMap((line) => {
      if (/^※\s*단\s*$/.test(line)) { followingException = true; return []; }
      const text = line.replace(/(\d+)월\s*(\d+)일/g, "$1월 $2일").replace(/^※\s*단\s*[,，]\s*/, "※ ");
      const result = followingException && !/^※/.test(text) ? `※ ${text}` : text;
      followingException = false;
      return [result];
    });
  }
  return informationLines(value, "plain");
}
export function hoursInformation(values: Evidence[]) {
  const days = [
    ["평일", "weekdayOperOpenHhmm", "weekdayOperColseHhmm"],
    ["휴일", "holidayOperOpenHhmm", "holidayCloseOpenHhmm"],
  ] as const;
  const rows = new Map<string, Evidence[]>();
  for (const entry of values) rows.set(entry.observationId, [...(rows.get(entry.observationId) || []), entry]);
  return [...rows.values()].flatMap((row) => {
    const result: { label: string; value: string }[] = [];
    for (const [label, start, end] of days) {
      const opening = row.find((entry) => entry.field === start);
      const closing = row.find((entry) => entry.field === end);
      if (opening || closing) result.push({ label, value: `${opening?.value || "시작 시각 미확인"} – ${closing?.value || "종료 시각 미확인"}` });
    }
    for (const entry of row) if (!days.some(([, start, end]) => entry.field === start || entry.field === end))
      result.push({ label: "", value: informationLines(formatSeasonalHours(entry.value.replace(/<br\s*\/?>/gi, "\n")), "hours")
        .map((line) => line.replace(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/g, "$1 ~ $2")).join("\n") });
    return result;
  });
}
