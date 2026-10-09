export type ProgramTextLine = { text: string; heading: boolean; headingText?: string };

const namedHeading = /^(?:주요\s*프로그램|메인\s*프로그램|부대\s*행사|체험\s*프로그램|공연\s*프로그램|이용\s*요금|입장료|운영\s*시간)$/;
function titleLike(value: string) {
  return value.length <= 40 && /^(?:['"‘“][\p{L}]+[^'"’”]*['"’”]|\p{L})/u.test(value)
    && !/[\d.!?。！？]|(?:합니다|됩니다|습니다|하세요|요망|이다|한다|하기|해요)$/.test(value);
}

export function programTextLines(value: string): ProgramTextLine[] {
  const lines = value.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)?.filter(Boolean) ?? [];
  return lines.map((text, index) => {
    const colon = text.match(/^(\s*(?:(\d{1,2}[.)]\s+))?([^:：\r\n]+?))(\s*[:：])/);
    if (colon && titleLike(colon[3].trim()) && (colon[2] || namedHeading.test(colon[3].trim())))
      return { text, heading: true, headingText: colon[1] };
    const bracket = text.match(/^\s*\[([^\]\r\n]+)\]\s*(?:\r?\n|\r|$)/);
    if (bracket && titleLike(bracket[1].trim())) return { text, heading: true, headingText: text.trimEnd() };
    const dated = text.match(/^(\s*\d{1,2}[.)]\s+(.+?))(?=\s+\d{4}[.-]\d{2}[.-]\d{2})/);
    if (dated && titleLike(dated[2].trim())) return { text, heading: true, headingText: dated[1] };
    const title = text.trim().match(/^\d{1,2}[.)]\s+([^\r\n]{1,40})$/u)?.[1];
    if (!title || !titleLike(title)) return { text, heading: false };
    let next = index + 1;
    while (next < lines.length && !lines[next].trim()) next += 1;
    const heading = next < lines.length && /^\s*[-•·*]\s+\S/.test(lines[next]);
    return { text, heading, ...(heading ? { headingText: text.trimEnd() } : {}) };
  });
}
