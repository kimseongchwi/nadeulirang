import { informationLines, isSupplementary } from "./text-boundaries.ts";

export type InformationPart =
  | { kind: "heading" | "text" | "note"; text: string }
  | { kind: "pair"; label: string; value: string; note?: string };

export function balancedText(text: string) {
  const stack: string[] = [];
  const pairs: Readonly<Record<string, string>> = { "(": ")", "（": "）", "[": "]" };
  for (const character of text) {
    if (pairs[character]) stack.push(pairs[character]);
    else if (")）]".includes(character) && stack.pop() !== character) return false;
  }
  return stack.length === 0;
}

// 기간·요일·시간이 명시된 부분만 배치하고 단일 시간의 이름은 만들지 않는다.
export function hoursParts(value: string): InformationPart[] {
  if (!balancedText(value)) return [{ kind: "text", text: value }];
  const time = "\\d{1,2}:\\d{2}\\s*(?:~|–|-)\\s*\\d{1,2}:\\d{2}";
  const label = "(?:운영\\s*시간|관람\\s*시간|체험\\s*시간|매표\\s*시간|준비\\s*시간|평일|휴일|주말|(?:하절기|동절기)\\s*\\([^()\\r\\n]+\\)|(?:1[0-2]|[1-9])\\s*월\\s*[~～]\\s*(?:1[0-2]|[1-9])\\s*월|\\d{1,2}\\s*부|(?:월|화|수|목|금|토|일)(?:요일)?\\s*[~～]\\s*(?:월|화|수|목|금|토|일)(?:요일)?|(?:월|화|수|목|금|토|일)요일)";
  const text = value.replace(new RegExp(`(\\[[^\\]\\r\\n]+\\])\\s*(?=${time}|${label})`, "g"), "$1\n")
    .replace(/(\d{1,2}\s*부)\s*[-–]\s*(?=\d{1,2}:\d{2})/g, "$1: ")
    .replace(new RegExp(`(${time})\\s*/\\s*(?=\\d{1,2}\\s*부\\s*[:：]?\\s*\\d{1,2}:\\d{2})`, "g"), "$1\n")
    .replace(new RegExp(`(${time})\\s+(?=${label}\\s*\\d)`, "g"), "$1\n")
    .replace(new RegExp(`-\\s*(?=${label}\\s*\\d)`, "g"), "\n")
    .replace(/(\d{1,2}:\d{2})\s*(?:~|–|-)\s*(\d{1,2}:\d{2})/g, "$1 ~ $2");
  const parts = text.split(/\r?\n/).filter((line) => line.trim()).flatMap((line): InformationPart[] => {
    const clean = line.trim();
    if (/^\[[^\]\r\n]+\]$/.test(clean)) return [{ kind: "heading", text: clean }];
    // 계절 뒤의 명시된 회차 시각 목록은 시간 범위로 바꾸지 않고 같은 값 열에 둔다.
    const seasonalTimes = clean.replace(/^-\s*/, "").match(/^((?:하절기|동절기)\s*\([^()\r\n]+\))\s*[:：]?\s*(\d{1,2}:\d{2}(?:\s*[,，]\s*\d{1,2}:\d{2})*)$/);
    if (seasonalTimes) return [{ kind: "pair", label: seasonalTimes[1], value: seasonalTimes[2].replace(/\s*[,，]\s*/g, ", ") }];
    const match = clean.replace(/^-\s*/, "").match(new RegExp(`^(?:(${label})\\s*[:：]?\\s*)?(${time})([\\s\\S]*)$`));
    if (!match) return [{ kind: /^(?:※|입장\s*마감)/.test(clean) ? "note" : "text", text: clean }];
    const tail = match[3].trim();
    if (tail && !/^(?:[(（]\s*입장\s*마감\s*\d{1,2}:\d{2}\s*[)）]|입장\s*마감\s*\d{1,2}:\d{2}|※[^\r\n]*)$/.test(tail))
      return [{ kind: "text", text: clean }];
    const note = tail.replace(/^[(（](.*)[)）]$/, "$1");
    return match[1] ? [{ kind: "pair", label: match[1], value: match[2], ...(note ? { note } : {}) }]
      : [{ kind: "text", text: match[2] }, ...(note ? [{ kind: "note" as const, text: note }] : [])];
  });
  // 완결된 기간·시간 제목 다음의 단일 시간·입장 마감만 같은 행으로 연결한다.
  return parts.flatMap((part, index): InformationPart[] => {
    const previous = parts[index - 1];
    const next = parts[index + 1];
    const period = (candidate: InformationPart | undefined) => candidate?.kind === "heading"
      && /^\[(?:(?:하절기|동절기)\([^()]+\)|\d{1,2}월[\d월~～/\s-]*|(?:운영|관람|체험|매표|준비)\s*시간)\]$/.test(candidate.text);
    if (period(part) && next?.kind === "text" && new RegExp(`^${time}$`).test(next.text)) {
      const note = parts[index + 2];
      return [{ kind: "pair", label: part.kind === "heading" ? part.text.slice(1, -1) : "", value: next.text,
        ...(note?.kind === "note" && /^입장\s*마감/.test(note.text) ? { note: note.text } : {}) }];
    }
    if (part.kind === "text" && period(previous) && new RegExp(`^${time}$`).test(part.text)) return [];
    if (part.kind === "note" && /^입장\s*마감/.test(part.text) && previous?.kind === "text"
      && new RegExp(`^${time}$`).test(previous.text) && period(parts[index - 2])) return [];
    return [part];
  });
}

export function contactParts(entry: { field: string; value: string }): InformationPart[] {
  const text = entry.value.replace(/<br\s*\/?>/gi, "\n").trim();
  const phones = [...text.matchAll(/0\d{1,3}-\d{3,4}-\d{4}(?:~\d+)?/g)];
  if (!phones.length || text.slice(phones.at(-1)!.index! + phones.at(-1)![0].length).trim())
    return [{ kind: "text", text }];
  let cursor = 0;
  const parts = phones.map((phone): InformationPart => {
    const label = text.slice(cursor, phone.index).replace(/^[\s/;,·]+|[\s:：]+$/g, "");
    cursor = phone.index! + phone[0].length;
    const fieldLabel = entry.field === "phoneNumber" ? "시설 연락처" : entry.field === "operPhoneNumber" ? "운영기관 연락처" : "";
    return label || phones.length === 1 && fieldLabel ? { kind: "pair", label: label || fieldLabel, value: phone[0] }
      : { kind: "text", text: phone[0] };
  });
  // 조건이나 다른 숫자가 기관 이름에 섞이면 관계를 추정하지 않는다.
  return parts.some((part) => part.kind === "pair" && /\d|[()※]/.test(part.label)) ? [{ kind: "text", text }] : parts;
}

export function serviceInformation(value: string) {
  // 안내서비스의 바깥 포장만 걷어내며 내부 조건·중첩 괄호·뒤의 문의는 보존한다.
  const prefix = value.match(/^\s*가능\s*[(（]/);
  let text = value;
  if (prefix && balancedText(value)) {
    const opening = prefix[0].length - 1;
    for (let index = opening + 1; index < value.length; index++) {
      if (")）".includes(value[index]) && balancedText(value.slice(opening, index + 1))) {
        const content = value.slice(opening + 1, index).trim();
        const tail = value.slice(index + 1);
        if (content) text = content + (tail && /^[가-힣A-Za-z0-9]/.test(tail) ? " " : "") + tail;
        break;
      }
    }
  }
  return text.replace(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/g, "$1 ~ $2");
}

export function serviceParts(value: string): InformationPart[] {
  const text = serviceInformation(value.replace(/<br\s*\/?>/gi, "\n"));
  if (!balancedText(text)) return [{ kind: "text", text }];
  return informationLines(text, "plain").flatMap((line) => hoursParts(line).map((part): InformationPart => {
    if (part.kind === "pair" || part.kind === "note") return part;
    return { kind: isSupplementary(part.text) ? "note" : "text", text: part.text };
  }));
}
