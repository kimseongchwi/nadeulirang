# 백엔드

Spring Boot·Java 21·Maven Wrapper 기반 프로젝트입니다. 버전 선택과 환경 설정·실행·검증 명령은 [루트 README](../README.md#백엔드-실행검증)를 따릅니다.

`src/main/resources/db/migration/`의 Flyway 마이그레이션으로 DB 변경을 관리합니다. 이미 적용한 파일은 수정하지 않고 다음 버전 파일을 추가합니다. 기능 테스트는 `src/test/`에 둡니다.
