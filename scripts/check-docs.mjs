import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

// 직접 작성한 추적 문서와 존재하는 로컬 기록만 검사한다. 외부 URL을 조회하지 않는다.
const files = execFileSync("git", ["ls-files", "-z", "*.md"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
for (const file of ["docs/WORKLOG.md", "docs/ERRORS.md"]) if (existsSync(file)) files.push(file);
const contents = (file) =>
  readFileSync(file, "utf8").replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, "");
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/ /g, "-");
const anchors = (file) => {
  const used = new Set();
  for (const [, heading] of contents(file).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slug(heading);
    let name = base,
      suffix = 0;
    while (used.has(name)) name = `${base}-${++suffix}`;
    used.add(name);
  }
  return used;
};
const failures = [];
let checked = 0;
for (const file of files) {
  if (!existsSync(file)) {
    failures.push(`${file}: 문서 없음`);
    continue;
  }
  for (const [, href] of contents(file).matchAll(/(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    if (/^(https?:|mailto:|data:|\/)/.test(href)) continue;
    const [name, anchor] = href.split("#");
    const target = path.resolve(
      path.dirname(file),
      decodeURIComponent(name || path.basename(file)),
    );
    checked++;
    if (!existsSync(target)) failures.push(`${file}: 없는 파일 ${href}`);
    else if (
      anchor &&
      target.toLowerCase().endsWith(".md") &&
      !anchors(target).has(decodeURIComponent(anchor))
    )
      failures.push(`${file}: 없는 앵커 ${href}`);
  }
}
console.log(`문서 ${files.length}개·내부 링크 ${checked}개 검사: ${failures.length}개 오류`);
for (const failure of failures) console.error(failure);
process.exitCode = failures.length ? 1 : 0;
