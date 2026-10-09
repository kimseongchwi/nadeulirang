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
  const label = "(?:운영\\s*시간|관람\\s*시간|매표\\s*시간|준비\\s*시간|평일|휴일|주말|(?:월|화|수|목|금|토|일)(?:요일)?\\s*[~～]\\s*(?:월|화|수|목|금|토|일)(?:요일)?|(?:월|화|수|목|금|토|일)요일)";
  const text = value.replace(new RegExp(`(\\[[^\\]\\r\\n]+\\])\\s*(?=${time}|${label})`, "g"), "$1\n")
    .replace(new RegExp(`(${time})\\s+(?=${label}\\s*\\d)`, "g"), "$1\n")
    .replace(new RegExp(`-\\s*(?=${label}\\s*\\d)`, "g"), "\n")
    .replace(/(\d{1,2}:\d{2})\s*(?:~|–|-)\s*(\d{1,2}:\d{2})/g, "$1 ~ $2");
  return text.split(/\r?\n/).filter((line) => line.trim()).flatMap((line): InformationPart[] => {
    const clean = line.trim();
    if (/^\[[^\]\r\n]+\]$/.test(clean)) return [{ kind: "heading", text: clean }];
    const match = clean.match(new RegExp(`^(?:(${label})\\s*[:：]?\\s*)?(${time})([\\s\\S]*)$`));
    if (!match) return [{ kind: /^(?:※|입장\s*마감)/.test(clean) ? "note" : "text", text: clean }];
    const tail = match[3].trim();
    if (tail && !/^(?:[(（]\s*입장\s*마감\s*\d{1,2}:\d{2}\s*[)）]|입장\s*마감\s*\d{1,2}:\d{2}|※[^\r\n]*)$/.test(tail))
      return [{ kind: "text", text: clean }];
    const note = tail.replace(/^[(（](.*)[)）]$/, "$1");
    return match[1] ? [{ kind: "pair", label: match[1], value: match[2], ...(note ? { note } : {}) }]
      : [{ kind: "text", text: match[2] }, ...(note ? [{ kind: "note" as const, text: note }] : [])];
  });
}

export function serviceInformation(value: string) {
  // 안내서비스의 단독 가능과 요일·시간만 감싼 괄호에 한정한다.
  return value.replace(/^가능\s*[(（]((?:월|화|수|목|금|토|일)요일\s*[~～]\s*(?:월|화|수|목|금|토|일)요일\s+\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2})[)）](?=\s*(?:※|$))/, "$1")
    .replace(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/g, "$1 ~ $2");
}
