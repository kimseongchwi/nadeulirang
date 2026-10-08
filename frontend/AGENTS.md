# 프론트 개발 안내

[루트 개발 지침](../AGENTS.md)을 적용한다. page.tsx는 URL·서버 조회·제목을, 옆 화면 파일은 페이지 전용 UI를 맡는다. 공유 UI는 components, 나들이 공통 타입·데이터 처리는 features/outings에 둔다. 서버 조회와 브라우저 상태 경계를 유지하며 UI 가이드도 실제 사용처로 확인한다.

아래 블록은 설치된 Next.js가 관리하는 안내다. 블록 밖에 필요한 프론트 규칙을 추가하고 관리 블록은 보존한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
