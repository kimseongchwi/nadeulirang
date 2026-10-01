import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMessage } from "./check-message.mjs";

test("한국어 제목과 본문이 있는 정상 메시지를 허용한다", () => {
  assert.doesNotThrow(() => validateMessage("chore(repo): 개발 규칙 정리\n\n이유·내용: 개발 기준 정리.\n검증: 도구 테스트 통과."));
});

test("잘못된 유형·본문 누락·영문 설명을 차단한다", () => {
  assert.throws(() => validateMessage("update: 변경\n\n변경 설명"), /커밋 제목/);
  assert.throws(() => validateMessage("docs: 문서 정리"), /본문이 필요/);
  assert.throws(() => validateMessage("chore(repo): update workflow\n\n규칙 정리"), /제목의 설명은 한국어/);
  assert.throws(() => validateMessage("chore(repo): 개발 규칙 정리\n\nUpdate workflow."), /본문은 한국어/);
});

test("코드 검사 실패가 실제 Git 커밋을 차단한다", (t) => {
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
  const script = fileURLToPath(new URL("./check-commit.mjs", import.meta.url));
  write(".test-hooks/pre-commit", `#!/bin/sh\nexec ${shellQuote(process.execPath.replaceAll("\\", "/"))} ${shellQuote(script.replaceAll("\\", "/"))}\n`);
  chmodSync(path.join(dir, ".test-hooks/pre-commit"), 0o755);
  write(".gitignore", ".test-hooks/\n");
  write("frontend/package.json", JSON.stringify({ scripts: { "check:quick": "node --check bad.js" } }));
  write("frontend/bad.js", "const = ;\n");
  okGit("add", ".gitignore", "frontend");
  const result = git("commit", "-m", "chore(frontend): 검증용 변경", "-m", "검증: 실패하는 코드 검사가 커밋을 차단하는지 확인.");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /검사 실패: 커밋을 중단/);
  assert.notEqual(git("rev-parse", "--verify", "HEAD").status, 0, "차단한 커밋이 생성되면 안 됩니다.");
});
