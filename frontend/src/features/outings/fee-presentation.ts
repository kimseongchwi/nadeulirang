import type { Evidence } from "./api-types";
import { evidenceLines } from "./detail-information.ts";

export type FeePart =
  | { kind: "heading" | "text"; text: string }
  | { kind: "pair"; label: string; price: string }
  | { kind: "item"; label: string; text: string };
const target = /^(?:일반|개인|단체|성인|어른|대인|청소년|어린이|소인|유아|경로|군인|지역주민|달성군민|주민|도민|장애인|국가유공자)/;
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
export function feeParts(entry: Pick<Evidence, "field" | "value">): FeePart[] {
  return evidenceLines(entry, "fee").flatMap(compoundLines).flatMap((line): FeePart[] => {
    // 금액/조건 뒤에 다음 이름·금액이 오는 항목 구분만 띄운다.
    const text = line.trim().replace(/(원(?:\s*[(（][^()（）]*[)）])?)\s*-\s*(?=[가-힣A-Za-z][^()\r\n-]*?\d[\d,]*\s*원)/g, "$1 - ");
    if (/^\[[^\]\r\n]+\]$/.test(text)) return [{ kind: "heading", text }];
    const pair = text.match(/^(.+?)\s+(\d[\d,]*)\s*원$/);
    const formatted = pair && price(pair[2]);
    if (pair && formatted && target.test(pair[1]) && !/[+\[\]:：]|\d[\d,]*\s*원/.test(pair[1]) && balanced(pair[1]))
      return [{ kind: "pair", label: pair[1], price: formatted }];
    const item = text.match(/^(\+?\s*(?:단체\s*관람료|교육체험|체험요금))(?=[\s\d(（])([\s\S]*)$/);
    if (item && balanced(text)) return [{ kind: "item", label: item[1], text: item[2].replace(/\d[\d,]*\s*원/g, (value) => price(value.replace(/\s*원$/, "")) || value) }];
    return [{ kind: "text", text }];
  });
}
function balanced(text: string) {
  const stack: string[] = [];
  const pairs: Readonly<Record<string, string>> = { "(": ")", "（": "）" };
  for (const character of text) {
    if (pairs[character]) stack.push(pairs[character]);
    else if (")）".includes(character) && stack.pop() !== character) return false;
  }
  return stack.length === 0;
}

export function compoundFeeText(label: string, text: string) {
  // 교육체험 괄호 전체가 명확한 이름/가격 목록일 때만 안쪽 줄바꿈을 허용한다.
  const inner = label.replace(/^\+\s*/, "") === "교육체험" && text.match(/^\((.+)\)$/);
  const items = inner ? inner[1].split("+") : [];
  return items.length > 1 && items.every((item) => /^[^()+]+\s\d[\d,]*원$/.test(item.trim()))
    ? `(${items.join("\n+")})` : text;
}
