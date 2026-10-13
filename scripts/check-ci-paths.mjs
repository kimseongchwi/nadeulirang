import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { checkScopes } from "./check-scopes.mjs";

// Git 이벤트의 SHA만 명령 인수로 사용한다. 사용자 브랜치 이름/본문은 실행하지 않는다.
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const sha = (value) => {
  if (!/^[a-f0-9]{40,64}$/.test(value || "")) throw new Error("비교 SHA가 올바르지 않습니다.");
  return value;
};
let scopes;
if (
  process.env.GITHUB_EVENT_NAME === "workflow_dispatch" ||
  !event.before ||
  /^0+$/.test(event.before)
) {
  if (event.pull_request) {
    const base = sha(event.pull_request.base.sha),
      head = sha(event.pull_request.head.sha);
    const paths = execFileSync(
      "git",
      ["diff", "--no-renames", "--name-only", "-z", `${base}...${head}`],
      { encoding: "utf8" },
    );
    scopes = checkScopes(paths.split("\0").filter(Boolean));
  } else scopes = { frontend: true, backend: true, tooling: true };
} else {
  const paths = execFileSync(
    "git",
    ["diff", "--no-renames", "--name-only", "-z", sha(event.before), sha(event.after)],
    { encoding: "utf8" },
  );
  scopes = checkScopes(paths.split("\0").filter(Boolean));
}
for (const [name, enabled] of Object.entries(scopes)) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${enabled}\n`);
}
console.log(scopes);
