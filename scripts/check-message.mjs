import { readFileSync } from "node:fs";

export function validateMessage(message) {
  const [title, separator, ...body] = message.trimEnd().split(/\r?\n/);
  if (!/^(feat|fix|docs|refactor|test|chore|perf|ci)(\([a-z0-9-]+\))?!?: \S.+$/.test(title ?? "")) {
    throw new Error("커밋 제목은 유형(범위): 한국어 설명 형식을 사용하세요. 예: chore(repo): 개발 규칙 정리");
  }
  if (title.length > 72) throw new Error("커밋 제목은 72자 이내로 작성하세요.");
  if (!/[가-힣]/u.test(title.slice(title.indexOf(":") + 1))) {
    throw new Error("커밋 제목의 설명은 한국어로 작성하세요.");
  }
  if (separator !== "" || !body.some((line) => line.trim() && !line.startsWith("#"))) {
    throw new Error("제목 뒤 빈 줄과 변경 이유·내용·검증을 담은 본문이 필요합니다.");
  }
  if (!body.some((line) => !line.startsWith("#") && /[가-힣]/u.test(line))) {
    throw new Error("커밋 본문은 한국어로 작성하세요.");
  }
}

try {
  validateMessage(readFileSync(process.argv[2], "utf8"));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
