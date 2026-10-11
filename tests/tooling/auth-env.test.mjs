import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

test("인증 환경 적용은 허용 이름·작업 폴더만 읽으며 값의 PowerShell 표현식을 실행하거나 출력하지 않는다", { skip: process.platform !== "win32" }, (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "nadeulirang-auth-env-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase());
    rmSync(directory, { recursive: true, force: true });
  });
  mkdirSync(path.join(directory, "scripts"));
  copyFileSync("scripts/use-auth-env.ps1", path.join(directory, "scripts/use-auth-env.ps1"));
  writeFileSync(path.join(directory, ".env"), ['AUTH_SMTP_PASSWORD="$(throw 123)"', "AUTH_PUBLIC_ORIGIN=https://example.test", "DB_PASSWORD=ignored", "UNKNOWN_TOKEN=ignored", ""].join("\n"));
  const script = path.join(directory, "scripts/use-auth-env.ps1").replaceAll("'", "''");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
    `. '${script}'; if ($env:AUTH_SMTP_PASSWORD -ne '$(throw 123)' -or $env:AUTH_PUBLIC_ORIGIN -ne 'https://example.test' -or $env:UNKNOWN_TOKEN) { exit 1 }; Write-Output '인증 설정 검사 통과'`],
    { encoding: "utf8", env: { ...process.env, AUTH_SMTP_PASSWORD: "", UNKNOWN_TOKEN: "" } });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.includes("throw"), false);
});
