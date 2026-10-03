import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const names = new Set(["TOURAPI_SERVICE_KEY", "FESTIVAL_SERVICE_KEY", "MUSEUM_SERVICE_KEY", "DB_URL", "DB_USERNAME", "DB_PASSWORD"]);

// 공통 설정을 기본값으로 사용한다. 폴더별 빈 값은 공통 값을 지우지 않는다.
export function loadLocalSettings(projectRoot, sharedFile = path.join(os.homedir(), ".nadeulirang", ".env")) {
  const settings = {};
  for (const file of [sharedFile, path.join(projectRoot, ".env")]) {
    let content;
    try { content = readFileSync(file, "utf8"); }
    catch (error) { if (error.code === "ENOENT") continue; throw new Error("로컬 설정 파일을 읽지 못했습니다."); }
    for (const line of content.split(/\r?\n/)) {
      const entry = line.match(/^\s*([A-Z_]+)\s*=(.*)$/);
      if (!entry || !names.has(entry[1])) continue;
      let value = entry[2].trim();
      if (value.length >= 2 && (["\"", "'"].includes(value[0])) && value.at(-1) === value[0]) value = value.slice(1, -1);
      if (value.trim()) settings[entry[1]] = value;
    }
  }
  return settings;
}
