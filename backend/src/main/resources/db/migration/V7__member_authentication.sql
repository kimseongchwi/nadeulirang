-- 회원과 로그인 수단을 분리하며 적용된 이전 마이그레이션은 보존한다.
CREATE TABLE app_user (
    id uuid PRIMARY KEY,
    nickname varchar(40) NOT NULL,
    role varchar(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    status varchar(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    auth_version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
);
CREATE TABLE local_credential (
    user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash varchar(255) NOT NULL,
    verified_at timestamptz,
    password_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE oauth_account (
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    provider varchar(10) NOT NULL CHECK (provider IN ('kakao', 'naver')),
    subject varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, subject),
    UNIQUE (user_id, provider)
);
CREATE TABLE auth_token (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    purpose varchar(20) NOT NULL CHECK (purpose IN ('EMAIL_VERIFY', 'PASSWORD_RESET', 'LOCAL_LINK')),
    email varchar(254) NOT NULL,
    password_hash varchar(255),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at timestamptz
);
CREATE INDEX auth_token_user_idx ON auth_token(user_id, purpose);
CREATE TABLE user_consent (
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    kind varchar(10) NOT NULL CHECK (kind IN ('TERMS', 'PRIVACY')),
    version varchar(80) NOT NULL,
    agreed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, kind, version)
);
-- 재시작과 여러 서버에서도 인증/메일 요청 한도를 공유한다. 키는 원문 대신 해시다.
CREATE TABLE auth_rate_limit (
    bucket_hash char(64) PRIMARY KEY,
    started_at timestamptz NOT NULL,
    attempts integer NOT NULL
);
-- Spring Session JDBC 공식 PostgreSQL 구조. 자동 DDL은 사용하지 않는다.
CREATE TABLE spring_session (
    primary_id char(36) PRIMARY KEY,
    session_id char(36) NOT NULL,
    creation_time bigint NOT NULL,
    last_access_time bigint NOT NULL,
    max_inactive_interval integer NOT NULL,
    expiry_time bigint NOT NULL,
    principal_name varchar(100)
);
CREATE UNIQUE INDEX spring_session_ix1 ON spring_session(session_id);
CREATE INDEX spring_session_ix2 ON spring_session(expiry_time);
CREATE INDEX spring_session_ix3 ON spring_session(principal_name);
CREATE TABLE spring_session_attributes (
    session_primary_id char(36) NOT NULL REFERENCES spring_session(primary_id) ON DELETE CASCADE,
    attribute_name varchar(200) NOT NULL,
    attribute_bytes bytea NOT NULL,
    PRIMARY KEY (session_primary_id, attribute_name)
);
