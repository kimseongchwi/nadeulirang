import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.dirname(fileURLToPath(import.meta.url)).replaceAll("\\", "/");
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function fixture(t, branch = "codex/test") {
  const dir = mkdtempSync(path.join(os.tmpdir(), "nadeulirang-check-"));
  // 훅이 전달한 Git 인덱스·작업 폴더 변수를 임시 저장소가 상속하지 않게 한다.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")));
  const git = (...args) => spawnSync("git", args, { cwd: dir, env, encoding: "utf8" });
  const okGit = (...args) => {
    const result = git(...args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result;
  };
  const write = (name, contents) => {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), contents);
  };
  t.after(() => {
    const target = path.resolve(dir);
    assert.equal(path.dirname(target).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase());
    assert.ok(path.basename(target).startsWith("nadeulirang-check-"));
    rmSync(target, { recursive: true, force: true });
  });
  okGit("init", "-b", branch);
  okGit("config", "user.name", "커밋 검사 테스트");
  okGit("config", "user.email", "test@example.invalid");
  okGit("config", "core.hooksPath", ".test-hooks");
  const node = shellQuote(process.execPath.replaceAll("\\", "/"));
  write(".test-hooks/pre-commit", `#!/bin/sh\nexec ${node} ${shellQuote(`${scripts}/check-commit.mjs`)}\n`);
  write(".test-hooks/commit-msg", `#!/bin/sh\nexec ${node} ${shellQuote(`${scripts}/check-message.mjs`)} "$1"\n`);
  chmodSync(path.join(dir, ".test-hooks/pre-commit"), 0o755);
  chmodSync(path.join(dir, ".test-hooks/commit-msg"), 0o755);
  write(".gitignore", ".test-hooks/\n");
  write("README.md", "# 검증용 문서\n");
  okGit("add", ".gitignore", "README.md");
  const commit = (title = "docs: 검증용 변경", body = "변경 이유와 내용: 검증용 문서.\n검증: Git 훅 통합 테스트.") =>
    body === null ? git("commit", "-m", title) : git("commit", "-m", title, "-m", body);
  const blocked = (result, pattern) => {
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stderr + result.stdout, pattern);
    assert.notEqual(git("rev-parse", "--verify", "HEAD").status, 0, "차단된 커밋이 HEAD를 만들면 안 됩니다.");
  };
  return { write, okGit, commit, blocked };
}

test("정상적인 커밋 메시지와 문서는 실제 Git 커밋을 통과한다", (t) => {
  const f = fixture(t);
  assert.equal(f.commit().status, 0);
});

test("main 직접 커밋은 차단한다", (t) => {
  const f = fixture(t, "main");
  f.blocked(f.commit(), /main 직접 커밋/);
});

test("강제로 스테이징한 환경 설정 파일을 차단한다", (t) => {
  const f = fixture(t);
  f.write(".env", "EXAMPLE=placeholder\n");
  f.okGit("add", "-f", ".env");
  f.blocked(f.commit(), /설정·키 파일/);
});

test("커밋에 없는 문서로 연결되는 링크를 차단한다", (t) => {
  const f = fixture(t);
  f.write("README.md", "[계획](PLAN.md)\n");
  f.okGit("add", "README.md");
  f.blocked(f.commit(), /링크 대상/);
});

test("문서 검사는 작업 폴더 대신 스테이징한 내용을 검증한다", (t) => {
  const f = fixture(t);
  f.write("README.md", "[미스테이징 링크](missing.md)\n");
  assert.equal(f.commit().status, 0);
});

test("계획에 없는 작업 기록과 기록 없는 완료 항목을 차단한다", (t) => {
  const f = fixture(t);
  f.write("PLAN.md", "- [ ] P01 준비\n");
  f.write("docs/WORKLOG.md", "| P02 결과 |\n");
  f.okGit("add", "PLAN.md", "docs/WORKLOG.md");
  f.blocked(f.commit(), /P02가 PLAN/);
  f.write("PLAN.md", "- [x] P01 준비\n");
  f.write("docs/WORKLOG.md", "# 기록\n");
  f.okGit("add", "PLAN.md", "docs/WORKLOG.md");
  f.blocked(f.commit(), /P01의 WORKLOG/);
});

test("프론트 코드의 부분 스테이징은 검사 결과와 커밋이 달라지므로 차단한다", (t) => {
  const f = fixture(t);
  f.write("frontend/example.js", "const value = 1;\n");
  f.okGit("add", "frontend/example.js");
  f.write("frontend/example.js", "const value = 2;\n");
  f.blocked(f.commit(), /미스테이징 변경/);
});

test("프론트 검사 실패가 실제 Git 커밋을 차단한다", (t) => {
  const f = fixture(t);
  f.write("frontend/package.json", JSON.stringify({ scripts: { check: "node --check bad.js" } }));
  f.write("frontend/bad.js", "const = ;\n");
  f.okGit("add", "frontend/package.json", "frontend/bad.js");
  f.blocked(f.commit(), /프론트 검사 실패/);
});

test("잘못된 커밋 유형과 본문 없는 메시지를 차단한다", (t) => {
  const f = fixture(t);
  f.blocked(f.commit("update: 변경"), /커밋 제목/);
  f.blocked(f.commit("docs: 설명", null), /본문이 필요/);
});

test("한국어 설명이 없는 커밋 제목과 본문을 차단한다", (t) => {
  const f = fixture(t);
  f.blocked(f.commit("chore(repo): update development workflow"), /제목의 설명은 한국어/);
  f.blocked(f.commit("chore(repo): 개발 규칙 정리", "Update development workflow."), /본문은 한국어/);
});
