import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { loadLocalSettings } from "../../scripts/local-settings.mjs";

test("공통 비밀 설정은 폴더 이동·빈 입력에서도 유지하고 폴더별 설정만 우선한다", (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "nadeulirang-settings-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase());
    rmSync(directory, { recursive: true, force: true });
  });
  const shared = path.join(directory, "shared.env");
  const first = path.join(directory, "first");
  const next = path.join(directory, "next");
  mkdirSync(first); mkdirSync(next);
  const content = 'TOURAPI_SERVICE_KEY=common-tour\nFESTIVAL_SERVICE_KEY=common-festival\nMUSEUM_SERVICE_KEY=common-museum\nDB_URL=common-db\nDB_USERNAME=common-user\nDB_PASSWORD=" common=$(literal)#password "\nOTHER_TOKEN=ignored\n';
  writeFileSync(shared, content);
  writeFileSync(path.join(first, ".env"), "TOURAPI_SERVICE_KEY=\nFESTIVAL_SERVICE_KEY='folder-festival'\nDB_URL=folder-db\n");
  const expected = loadLocalSettings(next, shared);
  assert.equal(expected.TOURAPI_SERVICE_KEY, "common-tour");
  assert.equal(expected.DB_PASSWORD, " common=$(literal)#password ");
  assert.equal(Object.keys(expected).length, 6);
  assert.deepEqual(loadLocalSettings(first, shared), { ...expected, FESTIVAL_SERVICE_KEY: "folder-festival", DB_URL: "folder-db" });
  assert.equal(readFileSync(shared, "utf8"), content);
  assert.deepEqual(loadLocalSettings(next, path.join(directory, "missing.env")), {});
  if (process.platform === "win32") {
    const script = path.resolve("scripts/local-settings.ps1").replaceAll("'", "''");
    const quote = (s) => `'${s.replaceAll("'", "''")}'`;
    const command = `. '${script}'; Get-NadeulirangLocalSettings -ProjectRoot ${quote(first)} -SharedFile ${quote(shared)} | ConvertTo-Json -Compress`;
    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), loadLocalSettings(first, shared));
    const profile = path.join(directory, "profile");
    const scripts = path.join(first, "scripts");
    mkdirSync(profile); mkdirSync(scripts);
    for (const name of ["save-local-settings.ps1", "local-settings.ps1"]) copyFileSync(path.resolve("scripts", name), path.join(scripts, name));
    writeFileSync(path.join(first, ".env"), content);
    const save = () => spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(scripts, "save-local-settings.ps1")], {
      // Node가 상속한 PowerShell 7 모듈을 Windows PowerShell 5에서 읽지 않도록 한다.
      encoding: "utf8", env: { ...process.env, USERPROFILE: profile,
        PSModulePath: path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "Modules") },
    });
    const commonFile = path.join(profile, ".nadeulirang", ".env");
    for (let i = 0; i < 2; i++) {
      const saved = save();
      assert.equal(saved.status, 0, saved.stderr);
      assert.ok(!saved.stdout.includes("common-tour") && !saved.stdout.includes("literal"));
      assert.deepEqual(loadLocalSettings(next, commonFile), expected);
    }
  }
});
