import type { Evidence } from "./api-types";
import { evidenceLines } from "./detail-information.ts";
import { balancedText } from "./information-parts.ts";

export type FeePart =
  | { kind: "heading" | "text"; text: string }
  | { kind: "pair"; label: string; price: string; note?: string }
  | { kind: "group"; label: string; items: { label: string; price: string }[] }
  | { kind: "item"; label: string; text: string };
const target = /^(?:일반|개인|단체|성인|어른|대인|청소년|중고등학생|초등학생|학생|어린이|소인|유아|경로|노인|군인|지역주민|달성군민|주민|도민|장애인|국가유공자)/;
const namedFeeItem = /^[가-힣A-Za-z][^+\[\]:：\r\n]{0,30}(?:하우스|전시관|체험관|입장권|관람권|관람료|체험)$/;
const amount = /^(?:\d+|\d{1,3}(?:,\d{3})+)$/;
function price(value: string) {
  const number = Number(value.replaceAll(",", ""));
  return amount.test(value) && Number.isSafeInteger(number) ? `${number.toLocaleString("ko-KR")}원` : null;
}
// 괄호 밖의 명시된 항목만 나누며 +와 괄호 안 구성·합산 표현은 남긴다.
function compoundLines(text: string) {
  const result: string[] = [];
  const stack: string[] = [];
  const pairs: Readonly<Record<string, string>> = { "(": ")", "（": "）", "[": "]" };
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (!stack.length && character === "+" && /^(?:교육체험|체험요금|단체\s*관람료|무료\s*[(（])/.test(text.slice(index + 1).trimStart())) {
      result.push(text.slice(start, index));
      start = index; // 원문의 연결 기호도 표시한다.
    }
    if (pairs[character]) stack.push(pairs[character]);
    else if (stack.at(-1) === character) stack.pop();
  }
  result.push(text.slice(start));
  return result;
}
function listedLines(text: string) {
  if (!balancedText(text)) return [text];
  return text.replace(/(원(?:\s*[(（][^()（）]*[)）])?)\s*-\s*(?=[가-힣A-Za-z][^()\r\n-]*?\d[\d,]*\s*원)/g, "$1\n")
    .split("\n").map((line) => line.replace(/^-\s*(?=[가-힣].*\d[\d,]*원)/, ""));
}
function targetPrices(text: string): FeePart[] | null {
  const match = text.match(/^((?:어른|성인|청소년|군인|어린이|유아|경로)(?:\s*[·/]\s*(?:청소년|군인|어린이|성인))*(?:\([^()]*\))?)\s*[:：]\s*(개인\s+\d[\d,]*원(?:\s*\/\s*단체\s+\d[\d,]*원)?)$/);
  if (!match) return null;
  const pairs = match[2].split(/\s*\/\s*/).map((value) => value.match(/^(개인|단체)\s+(\d[\d,]*)원$/)!);
  if (pairs.some((pair) => !price(pair[2]))) return null;
  return [{ kind: "heading", text: match[1] }, ...pairs.map((pair): FeePart => ({ kind: "pair", label: pair[1], price: price(pair[2])! }))];
}
function parkingParts(text: string): FeePart[] | null {
  if (!balancedText(text)) return null;
  const normalized = text.replace(/^(소형차|중·대형차|중형차|대형차|승용차|경차)\s*(?:[:：/]\s*|\s+(?=기본))/gm, "[$1] ");
  const pattern = /\[(소형차|중·대형차|중형차|대형차|승용차|경차)\]\s*(기본\s+\d+\s*(?:시간|분)\s+\d[\d,]*원)\s*(?:\/\s*(초과[^\[\]\r\n]+))?/g;
  const matches = [...normalized.matchAll(pattern)];
  if (!matches.length || normalized.replace(pattern, "").trim() || matches.some((match) => !price(match[2].match(/(\d[\d,]*)원$/)![1]))) return null;
  return matches.map((match) => ({ kind: "pair", label: match[1], price: match[2], ...(match[3] ? { note: match[3].trim() } : {}) }));
}
export function feeParts(entry: Pick<Evidence, "field" | "value">): FeePart[] {
  const parking = parkingParts(entry.value);
  if (parking) return parking;
  // 대상: 개인/단체는 같은 완결된 문장 안에서만 연결한다.
  return evidenceLines(entry, "fee").flatMap(compoundLines).flatMap(listedLines).flatMap((line): FeePart[] => {
    const text = line.trim();
    if (/^\[[^\]\r\n]+\]$/.test(text)) return [{ kind: "heading", text }];
    const scopedPrices = targetPrices(text);
    if (scopedPrices) return scopedPrices;
    const freeTarget = text.match(/^\+?무료\s*[(（]((?:유치원생|초등학생|중학생|고등학생|어린이|청소년|유아|성인|경로)(?:\s*[~～·/,]\s*(?:유치원생|초등학생|중학생|고등학생|어린이|청소년|유아|성인|경로))*)[)）]$/);
    if (freeTarget && balancedText(text)) return [{ kind: "pair", label: freeTarget[1], price: "무료" }];
    const pair = text.match(/^(.+?)\s*[:：]?\s+(무료|\d[\d,]*\s*원)(\s*[(（][^()（）]*[)）])?$/);
    const formatted = pair && (pair[2] === "무료" ? "무료" : price(pair[2].replace(/\s*원$/, "")));
    const label = pair?.[1].replace(/\s*[:：]$/, "").trim() || "";
    if (pair && formatted && (target.test(label) || namedFeeItem.test(label)) && !/[+\[\]:：]|\d[\d,]*\s*원/.test(label) && balancedText(label))
      return [{ kind: "pair", label, price: formatted, ...(pair[3] ? { note: pair[3].trim() } : {}) }];
    const item = text.match(/^(\+?\s*(?:단체\s*관람료|교육체험|체험요금))(?=[\s\d(（])([\s\S]*)$/);
    if (item && balancedText(text)) {
      const items = compoundFeeItems(item[1], item[2]);
      if (items) return [{ kind: "group", label: item[1].replace(/^\+\s*/, ""), items }];
      return [{ kind: "item", label: item[1], text: item[2].replace(/\d[\d,]*\s*원/g, (value) => price(value.replace(/\s*원$/, "")) || value) }];
    }
    return [{ kind: "text", text }];
  });
}

export function compoundFeeItems(label: string, text: string) {
  // 완결된 괄호 전체가 명확한 항목/금액 목록일 때만 괄호 범위를 하위 묶음으로 표시한다.
  const inner = label.replace(/^\+\s*/, "") === "교육체험" && text.trim().match(/^(?:\((.+)\)|（(.+)）)$/);
  const items = inner ? (inner[1] || inner[2]).split("+") : [];
  const pairs = items.map((item) => item.trim().match(/^([^()（）+]+?)\s+(\d[\d,]*)\s*원$/));
  if (pairs.length < 2 || pairs.some((pair) => !pair || !price(pair[2]))) return null;
  return pairs.map((pair) => ({ label: pair![1], price: price(pair![2])! }));
}

export function displayFeeParts(entry: Pick<Evidence, "field" | "value">, facilityName?: string) {
  const parts = feeParts(entry);
  const heading = parts[0];
  const title = heading?.kind === "heading" && heading.text.match(/^\[([^\]]+)\]$/)?.[1];
  const comparable = (value: string) => value.replace(/\s+/g, "");
  // 상세 제목과 같은 첫 시설명만 생략한다. 대상·기간·다른 시설 제목은 유지한다.
  return title && facilityName && comparable(facilityName).endsWith(comparable(title)) ? parts.slice(1) : parts;
}
