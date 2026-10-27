import test from "node:test";
import assert from "node:assert/strict";
import { checkScopes } from "../../scripts/check-scopes.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("문서·프론트·백엔드·도구를 필요한 영역으로 선택한다", () => {
  assert.deepEqual(checkScopes(["README.md", "frontend/AGENTS.md", "backend/README.md"]), {
    frontend: false,
    backend: false,
    tooling: false,
  });
  assert.deepEqual(checkScopes(["frontend/src/app/page.tsx"]), {
    frontend: true,
    backend: false,
    tooling: false,
  });
  assert.deepEqual(checkScopes(["backend/pom.xml"]), {
    frontend: false,
    backend: true,
    tooling: false,
  });
  assert.deepEqual(checkScopes(["scripts/validate-tourapi.mjs"]), {
    frontend: false,
    backend: false,
    tooling: true,
  });
});

test("공통 설정·훅·CI와 DB 실행 도구가 필수 검사를 빠뜨리지 않는다", () => {
  for (const file of [
    ".editorconfig",
    ".gitattributes",
    "package.json",
    "package-lock.json",
    ".githooks/pre-commit",
    ".github/workflows/ci.yml",
    "scripts/check-scopes.mjs",
    "scripts/check-ci-paths.mjs",
    "scripts/check-commit.mjs",
  ]) {
    assert.deepEqual(checkScopes([file]), { frontend: true, backend: true, tooling: true }, file);
  }
  for (const file of [
    "scripts/local-db.ps1",
    "scripts/collect-data.ps1",
    "scripts/use-local-env.ps1",
    "scripts/check-backend.mjs",
    "scripts/local-settings.ps1",
    "scripts/save-local-settings.ps1",
    "scripts/export-review-data.ps1",
    "scripts/export-review-data.sql",
  ]) {
    assert.deepEqual(checkScopes([file]), { frontend: false, backend: true, tooling: true }, file);
  }
});

test("삭제·영역 간 이동은 이전 경로와 새 경로의 검사를 모두 선택한다", () => {
  assert.deepEqual(checkScopes(["backend/src/Removed.java"]), {
    frontend: false,
    backend: true,
    tooling: false,
  });
  assert.deepEqual(checkScopes(["frontend/src/old.ts", "scripts/new.mjs"]), {
    frontend: true,
    backend: false,
    tooling: true,
  });
  assert.deepEqual(checkScopes(["backend/old.java", "docs/old.md"]), {
    frontend: false,
    backend: true,
    tooling: false,
  });
});

test("CI 이벤트 비교는 문서·삭제/이동·PR·최초 push·수동 실행을 검사하고 비교 실패 시 중단한다", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "nadeulirang-ci-paths-"));
  t.after(() => {
    assert.equal(
      path.dirname(path.resolve(dir)).toLowerCase(),
      path.resolve(os.tmpdir()).toLowerCase(),
    );
    assert.ok(path.basename(dir).startsWith("nadeulirang-ci-paths-"));
    rmSync(dir, { recursive: true, force: true });
  });
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
  );
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: dir,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "codex/test");
  git("config", "user.name", "검사 테스트");
  git("config", "user.email", "test@example.invalid");
  git("config", "core.hooksPath", ".no-hooks");
  for (const folder of ["frontend", "backend", "docs"]) mkdirSync(path.join(dir, folder));
  writeFileSync(path.join(dir, "frontend/old.ts"), "export const sample = 1;\n");
  writeFileSync(path.join(dir, "backend/old.java"), "class Sample {}\n");
  git("add", "frontend/old.ts", "backend/old.java");
  git("commit", "-m", "검증 기반");
  const base = git("rev-parse", "HEAD");
  writeFileSync(path.join(dir, "docs/guide.md"), "# 검증 안내\n");
  git("add", "docs/guide.md");
  git("commit", "-m", "문서 변경");
  const docs = git("rev-parse", "HEAD");
  git("mv", "frontend/old.ts", "docs/old.md");
  git("rm", "backend/old.java");
  git("commit", "-m", "영역 이동과 삭제");
  const moved = git("rev-parse", "HEAD");
  const script = fileURLToPath(new URL("../../scripts/check-ci-paths.mjs", import.meta.url));
  const check = (name, event) => {
    const input = path.join(dir, "event.json"),
      output = path.join(dir, "output.txt");
    writeFileSync(input, JSON.stringify(event));
    writeFileSync(output, "");
    const result = spawnSync(process.execPath, [script], {
      cwd: dir,
      env: { ...env, GITHUB_EVENT_NAME: name, GITHUB_EVENT_PATH: input, GITHUB_OUTPUT: output },
      encoding: "utf8",
    });
    return { result, output: readFileSync(output, "utf8") };
  };
  const documents = check("push", { before: base, after: docs });
  assert.equal(documents.result.status, 0, documents.result.stderr);
  assert.equal(documents.output, "frontend=false\nbackend=false\ntooling=false\n");
  for (const event of [
    { before: docs, after: moved },
    { pull_request: { base: { sha: docs }, head: { sha: moved } } },
  ]) {
    const selection = check(event.pull_request ? "pull_request" : "push", event);
    assert.equal(selection.result.status, 0, selection.result.stderr);
    assert.equal(selection.output, "frontend=true\nbackend=true\ntooling=false\n");
  }
  for (const [name, event] of [
    ["push", { before: "0".repeat(40), after: moved }],
    ["workflow_dispatch", {}],
  ]) {
    assert.equal(check(name, event).output, "frontend=true\nbackend=true\ntooling=true\n");
  }
  assert.notEqual(check("push", { before: "잘못된 값", after: moved }).result.status, 0);
  assert.notEqual(check("push", { before: "f".repeat(40), after: moved }).result.status, 0);
});
