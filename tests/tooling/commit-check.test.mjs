import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMessage } from "../../scripts/check-message.mjs";

test("한국어 제목과 본문이 있는 정상 메시지를 허용한다", () => {
  assert.doesNotThrow(() => validateMessage("chore(repo): 개발 규칙 정리\n\n이유·내용: 개발 기준 정리.\n검증: 도구 테스트 통과."));
});

test("잘못된 유형·본문 누락·영문 설명을 차단한다", () => {
  assert.throws(() => validateMessage("update: 변경\n\n변경 설명"), /커밋 제목/);
  assert.throws(() => validateMessage("docs: 문서 정리"), /본문이 필요/);
  assert.throws(() => validateMessage("chore(repo): update workflow\n\n규칙 정리"), /제목의 설명은 한국어/);
  assert.throws(() => validateMessage("chore(repo): 개발 규칙 정리\n\nUpdate workflow."), /본문은 한국어/);
});

test("빠른·전체 커밋 검사의 실행 횟수와 실패·부분 스테이징·민감 파일 차단을 확인한다", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "nadeulirang-check-"));
  t.after(() => {
    const target = path.resolve(dir);
    assert.equal(path.dirname(target).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase());
    assert.ok(path.basename(target).startsWith("nadeulirang-check-"));
    rmSync(target, { recursive: true, force: true });
  });
  // 실제 저장소의 Git 인덱스·작업 폴더 변수를 임시 저장소에 전달하지 않는다.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")));
  const git = (...args) => spawnSync("git", args, { cwd: dir, env, encoding: "utf8" });
  const okGit = (...args) => {
    const result = git(...args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  };
  const write = (name, contents) => {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), contents);
  };
  okGit("init", "-b", "codex/test");
  okGit("config", "user.name", "커밋 검사 테스트");
  okGit("config", "user.email", "test@example.invalid");
  okGit("config", "core.hooksPath", ".test-hooks");
  // 테스트 훅을 설치하기 전에 임시 저장소의 ignore 기반만 만든다.
  write(".gitignore", ".test-hooks/\n");
  okGit("add", ".gitignore");
  okGit("commit", "-m", "chore(test): 검증 기반", "-m", "임시 저장소의 훅 폴더 제외.");
  const baseline = git("rev-parse", "HEAD").stdout.trim();
  const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const script = fileURLToPath(new URL("../../scripts/check-commit.mjs", import.meta.url));
  write(".test-hooks/pre-commit", `#!/bin/sh\nexec ${shellQuote(process.execPath.replaceAll("\\", "/"))} ${shellQuote(script.replaceAll("\\", "/"))}\n`);
  chmodSync(path.join(dir, ".test-hooks/pre-commit"), 0o755);
  write("frontend/package.json", JSON.stringify({ scripts: { "format:check": "node --check bad.js", "check:quick": "node --check bad.js" } }));
  write("frontend/bad.js", "const = ;\n");
  write("tests/tooling/README.md", "# 임시 검증용 문서\n");
  okGit("add", ".gitignore", "frontend", "tests/tooling/README.md");
  const result = git("commit", "-m", "chore(frontend): 검증용 변경", "-m", "검증: 실패하는 코드 검사가 커밋을 차단하는지 확인.");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /검사 실패: 커밋을 중단/);
  assert.equal(git("rev-parse", "HEAD").stdout.trim(), baseline, "차단한 커밋이 생성되면 안 됩니다.");
  // 도구 폴더의 문서 때문에 별도 도구 테스트가 실행되면 이 커밋은 실패한다.
  write("frontend/bad.js", "const value = 1;\n");
  okGit("add", "frontend/bad.js");
  okGit("commit", "-m", "chore(frontend): 검증용 코드 수정", "-m", "검증: 코드 수정 후 커밋 성공과 도구 문서의 검사 제외 확인.");

  // 백엔드 검사 명령은 임시 코드 검사로 대체해 실제 DB·JDK 없이 훅 분기를 검증한다.
  write("package.json", JSON.stringify({ scripts: {
    test: "node --check frontend/bad.js",
    "check:backend": "node --check backend/bad.js",
  } }));
  write("backend/bad.js", "const = ;\n");
  okGit("add", "package.json", "backend/bad.js");
  const backendFailure = git("commit", "-m", "chore(backend): 검증용 오류", "-m", "검증: 백엔드 검사 실패 차단.");
  assert.notEqual(backendFailure.status, 0);
  assert.match(backendFailure.stderr + backendFailure.stdout, /검사 실패: 커밋을 중단/);

  write("backend/bad.js", "const value = 1;\n");
  okGit("add", "backend/bad.js");
  write("backend/bad.js", "const value = 2;\n");
  const partial = git("commit", "-m", "chore(backend): 부분 변경", "-m", "검증: 백엔드 부분 스테이징 차단.");
  assert.notEqual(partial.status, 0);
  assert.match(partial.stderr + partial.stdout, /미스테이징 변경.*backend\/bad.js/);
  okGit("add", "backend/bad.js");
  okGit("commit", "-m", "chore(backend): 검증용 코드 수정", "-m", "검증: 백엔드 검사 성공 후 커밋 통과.");

  write("backend/bad.js", "const = ;\n");
  write("backend/README.md", "# 백엔드 문서\n");
  okGit("add", "backend/README.md");
  okGit("commit", "-m", "docs(backend): 검증용 문서", "-m", "검증: 백엔드 문서만 변경하면 코드 검사를 생략.");

  write("scripts/collect-data.ps1", "# 수집 실행 테스트\n");
  okGit("add", "scripts/collect-data.ps1");
  const collectorPartial = git("commit", "-m", "chore(collection): 수집 실행 검사", "-m", "검증: 수집 스크립트도 백엔드 미스테이징 변경을 차단.");
  assert.notEqual(collectorPartial.status, 0);
  assert.match(collectorPartial.stderr + collectorPartial.stdout, /미스테이징 변경.*backend\/bad.js/);

  write("backend/bad.js", "const value = 3;\n");
  okGit("add", "backend/bad.js");
  okGit("commit", "-m", "chore(collection): 검증용 도구", "-m", "검증: 수집 도구 검사 성공.");

  // 전체 검사는 빠른 검사와 따로 실행하지 않고 같은 필수 훅에서 한 번씩 실행한다.
  write(".test-hooks/record.mjs", `import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const check = process.argv.slice(2).join(" ");
appendFileSync(".test-hooks/checks.log", check + "\\n");
if (existsSync(".test-hooks/fail") && readFileSync(".test-hooks/fail", "utf8") === check) process.exit(1);
`);
  write("package.json", JSON.stringify({ scripts: {
    test: "node .test-hooks/record.mjs tooling",
    "check:docs": "node .test-hooks/record.mjs docs",
    "check:backend": "node .test-hooks/record.mjs backend",
  } }));
  write("frontend/package.json", JSON.stringify({ scripts: {
    "check:quick": "node ../.test-hooks/record.mjs frontend-quick",
    check: "node ../.test-hooks/record.mjs frontend-full",
  } }));
  okGit("add", "package.json", "frontend/package.json");
  const fullCommit = () => git("-c", "nadeulirang.checkMode=full", "commit", "-m",
    "chore(test): 전체 검사", "-m", "검증: 필수 훅에서 전체 검사와 실패 차단 확인.");
  const checkLog = path.join(dir, ".test-hooks/checks.log");
  const fullBaseline = git("rev-parse", "HEAD").stdout.trim();
  for (const [failure, expected] of [
    ["frontend-full", ["docs", "tooling", "frontend-full"]],
    ["backend --verify", ["docs", "tooling", "frontend-full", "backend --verify"]],
  ]) {
    write(".test-hooks/checks.log", "");
    write(".test-hooks/fail", failure);
    const failed = fullCommit();
    assert.notEqual(failed.status, 0, failed.stdout + failed.stderr);
    assert.equal(git("rev-parse", "HEAD").stdout.trim(), fullBaseline);
    assert.deepEqual(readFileSync(checkLog, "utf8").trim().split("\n"), expected);
  }
  rmSync(path.join(dir, ".test-hooks/fail"));
  write(".test-hooks/checks.log", "");
  const fullSuccess = fullCommit();
  assert.equal(fullSuccess.status, 0, fullSuccess.stdout + fullSuccess.stderr);
  assert.deepEqual(readFileSync(checkLog, "utf8").trim().split("\n"),
    ["docs", "tooling", "frontend-full", "backend --verify"]);
  assert.equal(git("config", "--get", "nadeulirang.checkMode").status, 1,
    "전체 검사 모드를 영구 설정으로 저장하면 안 됩니다.");

  write("README.md", "# 전체 검사 뒤 문서 수정\n");
  okGit("add", "README.md");
  write(".test-hooks/checks.log", "");
  assert.equal(fullCommit().status, 0);
  assert.equal(readFileSync(checkLog, "utf8"), "docs\n", "문서 전용 전체 검사는 코드 검사를 실행하지 않습니다.");
  write(".env.local", "TEST_ONLY=dummy\n");
  okGit("add", ".env.local");
  const secret = git("commit", "-m", "chore(test): 민감 파일 차단", "-m", "검증: 임시 설정 파일명 차단.");
  assert.notEqual(secret.status, 0);
  assert.match(secret.stderr + secret.stdout, /민감한 설정·키 파일/);
  okGit("reset", "--", ".env.local");
  rmSync(path.join(dir, ".env.local"));
  okGit("checkout", "-b", "main");
  write("README.md", "# main 직접 커밋 검증\n");
  okGit("add", "README.md");
  const main = git("commit", "-m", "docs(test): 직접 커밋 차단", "-m", "검증: main 직접 커밋 차단.");
  assert.notEqual(main.status, 0);
  assert.match(main.stderr + main.stdout, /main 직접 커밋을 중단/);
});

test("백엔드 검사에 테스트 생략 등 임의 Maven 인수를 전달하지 못한다", () => {
  const script = fileURLToPath(new URL("../../scripts/check-backend.mjs", import.meta.url));
  for (const options of [["--skipTests"], ["--verify", "-DskipTests"]]) {
    const result = spawnSync(process.execPath, [script, ...options], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /사용법: npm run check:backend/);
  }
});
