// 괄호 안 구분자·날짜·전화번호는 그대로 두고 확실한 목록 경계만 나눈다.
export function informationLines(value: string, kind: "fee" | "hours" | "closedDays" | "plain") {
  const result: string[] = [];
  let line = "";
  const stack: string[] = [];
  const pairs: Readonly<Record<string, string>> = { "(": ")", "（": "）", "[": "]" };
  const label = kind === "fee"
    ? /^(?:일반|개인|단체|대인|소인|성인|어른|어린이|청소년|중고등학생|초등학생|유아|경로|군인|지역|달성군민|주민|도민|장애인|국가유공자)/
    : /^(?:하절기|동절기|운영\s*시간|관람\s*시간|매표\s*시간|준비\s*시간|평일|휴일|주말|입장\s*마감|매주|(?:월|화|수|목|금|토|일)요일|\d{1,2}:\d{2})/;
  const closedLabel = /^(?:매주|매월|(?:월|화|수|목|금|토|일)요일|설날|설(?=[·\s]|$)|추석|(?:법정\s*|정부\s*지정\s*|대체)?공휴일|국경일|\d{1,2}월\s*\d{1,2}일)/;
  const flush = () => { if (line.trim()) result.push(line.trim()); line = ""; };
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    const top = stack.length === 0;
    const rest = value.slice(index + 1).trimStart();
    if (top && kind !== "plain" && (character === "\n" || character === "\r")) { flush(); continue; }
    if (top && kind !== "plain" && character === "[" && /^\[[^\]\r\n]+\]/.test(value.slice(index))) flush();
    if (top && (character === "※" || /^[*＊ⓘℹ]/.test(character) && (index === 0 || /\s/.test(value[index - 1])))) flush();
    if (top && kind !== "plain" && character === "-" && label.test(rest)
      && (!/^\d/.test(rest) || !/\d$/.test(line))) {
      if (kind === "hours" && /^\d{1,2}\s*부\s*$/.test(line.trim())) { line = `${line.trim()}: `; continue; }
      flush(); continue;
    }
    if (top && kind === "hours" && character === "/" && /^\d{1,2}\s*부\s*(?:[-:：]\s*)?\d{1,2}:\d{2}/.test(rest)) { flush(); continue; }
    if (top && character === "/" && (kind === "closedDays" && closedLabel.test(rest) && !isSupplementary(line) && !/^[월화수목금토일]$/.test(line.trim()) || kind === "fee" && label.test(rest)
      && /(?:원|무료|\b\d{1,9})\s*$/.test(line) && !/\d[./~-]\d/.test(line)
      && !/^(?:어른|성인|청소년|군인|어린이|유아|경로)[^:：\r\n]*[:：]/.test(line.trim())) && !/^https?:/.test(line.trim())) { flush(); continue; }
    if (top && kind === "closedDays" && ",+".includes(character) && !isSupplementary(line)) { flush(); continue; }
    line += character;
    if (pairs[character]) stack.push(pairs[character]);
    else if (stack.at(-1) === character) stack.pop();
  }
  flush();
  return result;
}
export const isSupplementary = (value: string) => /^(?:※|[*＊]\s|[ⓘℹ])/.test(value.trim());
