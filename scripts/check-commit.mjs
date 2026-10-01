import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
function git(...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} 실패`);
  return result.stdout;
}
const splitPaths = (output) => output.split("\0").filter(Boolean);
const frontendCode = (file) => file.startsWith("frontend/") && !file.endsWith(".md");
const tooling = (file) => /^(scripts\/|\.githooks\/|package\.json$)/.test(file);

function checkDocs(files) {
  const fileSet = new Set(files);
  const readIndex = (file) => git("show", `:${file}`);
  for (const file of files.filter((name) => name.endsWith(".md"))) {
    const content = readIndex(file).replace(/```[\s\S]*?```/g, "");
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].trim().replace(/^<|>$/g, "").split("#")[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(target)));
      if (!fileSet.has(resolved)) throw new Error(`${file}: 링크 대상이 커밋에 없습니다: ${target}`);
    }
  }
  if (fileSet.has("PLAN.md") && fileSet.has("docs/WORKLOG.md")) {
    const tasks = [...readIndex("PLAN.md").matchAll(/^- \[([ x])\] (P\d+) /gm)];
    const ids = tasks.map((match) => match[2]);
    if (new Set(ids).size !== ids.length) throw new Error("PLAN 항목 번호가 중복되었습니다.");
    const recorded = [...readIndex("docs/WORKLOG.md").matchAll(/^\| (P\d+) /gm)].map((match) => match[1]);
    for (const id of recorded) {
      if (!ids.includes(id)) throw new Error(`WORKLOG의 ${id}가 PLAN에 없습니다.`);
    }
    for (const task of tasks.filter((match) => match[1] === "x")) {
      if (!recorded.includes(task[2])) throw new Error(`완료 항목 ${task[2]}의 WORKLOG 기록이 없습니다.`);
    }
  }
}

function runFrontendChecks() {
  const npmCli = process.env.npm_execpath || [
    path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    path.resolve(path.dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
  ].find(existsSync);
  if (!npmCli || !existsSync(npmCli)) throw new Error("npm 경로를 찾지 못했습니다. npm run check:commit으로 실행하세요.");
  const result = spawnSync(process.execPath, [npmCli, "--prefix", "frontend", "run", "check"], { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("프론트 검사 실패: 커밋을 중단합니다.");
}

try {
  const files = splitPaths(git("ls-files", "-z"));
  if (process.argv.includes("--docs")) {
    checkDocs(files);
    console.log("문서 링크·계획·기록 검사 통과");
  } else {
    const branch = git("symbolic-ref", "--short", "HEAD").trim();
    if (["main", "master"].includes(branch)) throw new Error("main 직접 커밋을 중단합니다. 작업 브랜치를 만드세요.");
    const before = git("ls-files", "--stage", "-z");
    const staged = splitPaths(git("diff", "--cached", "--name-only", "-z"));
    const addedOrChanged = splitPaths(git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"));
    for (const file of addedOrChanged) {
      const basename = path.posix.basename(file);
      if ((/^\.env(?:\.|$)/.test(basename) && basename !== ".env.example") || /\.(pem|key)$/i.test(basename)) {
        throw new Error(`민감한 설정·키 파일은 커밋할 수 없습니다: ${file}`);
      }
    }
    git("diff", "--cached", "--check");
    checkDocs(files);
    const changed = splitPaths(git("diff", "--name-only", "-z"))
      .concat(splitPaths(git("ls-files", "--others", "--exclude-standard", "-z")));
    const needsFrontend = staged.some(frontendCode);
    const needsTooling = staged.some(tooling);
    const unstaged = changed.filter((file) => (needsFrontend && frontendCode(file)) || (needsTooling && tooling(file)));
    if (unstaged.length) throw new Error(`검사 대상 코드에 미스테이징 변경이 있습니다: ${unstaged.join(", ")}`);
    if (needsFrontend) runFrontendChecks();
    if (git("ls-files", "--stage", "-z") !== before) throw new Error("검사 도중 스테이징 내용이 바뀌었습니다. 다시 검사하세요.");
    console.log("커밋 검사 통과");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
