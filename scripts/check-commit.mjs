import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} 실패`);
  return result.stdout;
}
const splitPaths = (output) => output.split("\0").filter(Boolean);
const frontendCode = (file) => file.startsWith("frontend/") && !file.endsWith(".md");
const backendCode = (file) => file.startsWith("backend/") && !file.endsWith(".md");
const tooling = (file) => !file.endsWith(".md") && /^(scripts\/|tests\/tooling\/|\.githooks\/|package\.json$|\.github\/workflows\/)/.test(file);
const backendEnvironment = (file) => ["scripts/check-backend.mjs", "scripts/use-local-env.ps1"].includes(file);

function runNpm(args) {
  const npmCli = process.env.npm_execpath || [
    path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    path.resolve(path.dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
  ].find(existsSync);
  if (!npmCli || !existsSync(npmCli)) throw new Error("npm 경로를 찾지 못했습니다. npm run check:commit으로 실행하세요.");
  const result = spawnSync(process.execPath, [npmCli, ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("검사 실패: 커밋을 중단합니다.");
}

try {
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
  const needsFrontend = staged.some(frontendCode);
  const needsTooling = staged.some(tooling);
  const needsBackend = staged.some((file) => backendCode(file) || backendEnvironment(file));
  const changed = splitPaths(git("diff", "--name-only", "-z"))
    .concat(splitPaths(git("ls-files", "--others", "--exclude-standard", "-z")));
  const unstaged = changed.filter((file) => (needsFrontend && frontendCode(file)) || (needsTooling && tooling(file))
    || (needsBackend && (backendCode(file) || backendEnvironment(file))));
  if (unstaged.length) throw new Error(`검사 대상 코드에 미스테이징 변경이 있습니다: ${unstaged.join(", ")}`);
  if (needsTooling) runNpm(["test"]);
  if (needsFrontend) runNpm(["--prefix", "frontend", "run", "check:quick"]);
  if (needsBackend) runNpm(["run", "check:backend"]);
  if (git("ls-files", "--stage", "-z") !== before) throw new Error("검사 도중 스테이징 내용이 바뀌었습니다. 다시 검사하세요.");
  console.log(needsFrontend || needsTooling || needsBackend ? "변경 코드 검사 통과" : "코드 변경 없음: 기본 커밋 검사 통과");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
