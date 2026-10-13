-- 기존 회원·수단·메일 토큰은 보존하고 구글 제공자만 허용한다.
ALTER TABLE oauth_account DROP CONSTRAINT oauth_account_provider_check;
ALTER TABLE oauth_account ADD CONSTRAINT oauth_account_provider_check
    CHECK (provider IN ('kakao', 'naver', 'google'));
