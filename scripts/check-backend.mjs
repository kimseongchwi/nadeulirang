import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// 훅은 저장소 루트에서 실행한다. Windows 로컬 환경은 자식 프로세스에만 적용한다.
const root = process.cwd();
const env = { ...process.env, MAVEN_USER_HOME: path.join(root, ".local", "maven") };
const args = ["-B", "-ntp", "-f", "backend/pom.xml", `-Dmaven.repo.local=${path.join(root, ".local", "maven", "repository")}`, "test"];
let result;
if (process.platform === "win32") {
  const localEnvironment = existsSync(path.join(root, ".local", "java"))
    ? ". ./scripts/use-local-env.ps1; " : "";
  // 값은 환경으로 전달하며 비밀번호를 명령 인수에 넣지 않는다.
  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
    `$ErrorActionPreference = 'Stop'; ${localEnvironment}& ./backend/mvnw.cmd ${args.map(quote).join(" ")}; exit $LASTEXITCODE`],
  { cwd: root, env, stdio: "inherit" });
} else {
  result = spawnSync("./backend/mvnw", args, { cwd: root, env, stdio: "inherit" });
}
if (result.error || result.status !== 0) {
  console.error("백엔드 검사 실패: JDK 21·DB 실행 상태·DB 환경 변수와 위 검사 결과를 확인하세요.");
  process.exitCode = 1;
}
