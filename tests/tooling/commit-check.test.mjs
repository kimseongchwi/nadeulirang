import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
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

test("프론트·백엔드 검사 실패와 부분 스테이징을 차단하고 문서는 검사를 생략한다", (t) => {
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
  const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const script = fileURLToPath(new URL("../../scripts/check-commit.mjs", import.meta.url));
  write(".test-hooks/pre-commit", `#!/bin/sh\nexec ${shellQuote(process.execPath.replaceAll("\\", "/"))} ${shellQuote(script.replaceAll("\\", "/"))}\n`);
  chmodSync(path.join(dir, ".test-hooks/pre-commit"), 0o755);
  write(".gitignore", ".test-hooks/\n");
  write("frontend/package.json", JSON.stringify({ scripts: { "check:quick": "node --check bad.js" } }));
  write("frontend/bad.js", "const = ;\n");
  write("tests/tooling/README.md", "# 임시 검증용 문서\n");
  okGit("add", ".gitignore", "frontend", "tests/tooling/README.md");
  const result = git("commit", "-m", "chore(frontend): 검증용 변경", "-m", "검증: 실패하는 코드 검사가 커밋을 차단하는지 확인.");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /검사 실패: 커밋을 중단/);
  assert.notEqual(git("rev-parse", "--verify", "HEAD").status, 0, "차단한 커밋이 생성되면 안 됩니다.");
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
});
