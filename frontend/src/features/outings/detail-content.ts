import type { Detail, Evidence } from "./api-types";
import { orderedNotes } from "./api-query.ts";

export type DetailNote = { id: string; title: string; values: Evidence[] };
const comparable = (value: string) => value.replace(/\s+/g, "").trim();
const noteGroups: Readonly<Record<string, string>> = {
  행사소개: "description", 행사내용: "programs", 운영시간: "hours", 이용시간: "hours",
  "휴관·휴무": "closedDays", 휴관일: "closedDays", 휴무일: "closedDays",
  입장료: "generalFee", "일반입장료안내": "generalFee", 이용요금: "generalFee",
  "체험·추가요금": "extraFee", 할인안내: "discount", 예약안내: "reservation", 연락처: "contact",
  주차: "parkingFee", 주차안내: "parkingFee", 주차요금: "parkingFee",
};

export function detailContent(information: Detail["information"]) {
  const description = [...(information.description || [])];
  const programs: DetailNote[] = [];
  const notes: DetailNote[] = [];
  const rows = new Map<string, Evidence[]>();
  for (const entry of orderedNotes(information.notes || [])) {
    const row = rows.get(entry.observationId) || [];
    row.push(entry);
    rows.set(entry.observationId, row);
  }
  const known = new Map(Object.entries(information).filter(([key]) => key !== "notes")
    .map(([key, values]) => [key, new Set(values.map((entry) => comparable(entry.value)).filter(Boolean))]));
  const addUnique = (values: Evidence[], group: string) => values.filter((entry) => {
    const value = comparable(entry.value);
    const seen = known.get(group) || new Set<string>();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    known.set(group, seen);
    return true;
  });
  for (const [id, row] of rows) {
    for (const entry of row.filter((entry) => entry.field === "program" || entry.field === "subevent")) {
      const values = addUnique([entry], "programs");
      if (values.length) programs.push({ id: id + ":" + entry.field, title: "주요 프로그램", values });
    }
  }
  for (const [id, row] of rows) {
    const title = row.find((entry) => entry.field === "infoname")?.value.trim() || "";
    const group = noteGroups[comparable(title)] || `note:${comparable(title)}`;
    const values = addUnique(row.filter((entry) => !["infoname", "program", "subevent"].includes(entry.field)), group);
    if (!values.length) continue;
    if (comparable(title) === "행사소개") description.push(...values);
    else if (comparable(title) === "행사내용") programs.push({ id, title: "주요 프로그램", values });
    else notes.push({ id, title, values });
  }
  return { description, programs, notes };
}
