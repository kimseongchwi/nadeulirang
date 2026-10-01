# 프론트 개발 안내

[루트 개발 지침](../AGENTS.md)을 함께 적용한다. 이 파일에는 Next.js 전용 안내만 둔다. 제품·디자인 상태와 실행 방법은 루트 문서를 참고한다.

아래 블록은 설치된 Next.js가 관리하는 안내다. 블록 밖에 필요한 프론트 규칙을 추가하고 관리 블록은 보존한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
