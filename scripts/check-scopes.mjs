// 훅과 CI는 같은 경로 규칙을 사용한다. 삭제·이동은 이전/현재 경로를 모두 전달한다.
const common = (file) =>
  /^(package(?:-lock)?\.json$|\.editorconfig$|\.gitattributes$|\.githooks\/|\.github\/workflows\/|scripts\/check-(?:scopes|ci-paths|commit)\.mjs$)/.test(
    file,
  );
const backendEnvironment = (file) =>
  [
    "scripts/check-backend.mjs",
    "scripts/use-local-env.ps1",
    "scripts/collect-data.ps1",
    "scripts/local-db.ps1",
    "scripts/local-settings.ps1",
    "scripts/save-local-settings.ps1",
    "scripts/export-review-data.ps1",
    "scripts/export-review-data.sql",
  ].includes(file);

export function checkScopes(paths) {
  const code = paths.filter((file) => !file.toLowerCase().endsWith(".md"));
  return {
    frontend: code.some((file) => file.startsWith("frontend/") || common(file)),
    backend: code.some(
      (file) => file.startsWith("backend/") || backendEnvironment(file) || common(file),
    ),
    tooling: code.some(
      (file) => /^(scripts\/|tests\/tooling\/|\.gitignore$)/.test(file) || common(file),
    ),
  };
}
