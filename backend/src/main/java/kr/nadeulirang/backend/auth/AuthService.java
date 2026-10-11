package kr.nadeulirang.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthService {
    record Member(UUID id, String nickname, String role, String status, long version) { }
    record Method(String provider, String email, boolean verified) { }
    record Credential(UUID userId, String email, String hash, boolean verified) { }
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final AuthMail mail;
    private final AuthRateLimiter limiter;
    private final String termsVersion;
    private final String privacyVersion;
    private final String dummyHash;

    AuthService(JdbcTemplate jdbc, PasswordEncoder encoder, AuthMail mail, AuthRateLimiter limiter,
                @Value("${auth.terms-version:}") String terms, @Value("${auth.privacy-version:}") String privacy) {
        this.jdbc = jdbc; this.encoder = encoder; this.mail = mail; this.limiter = limiter;
        this.termsVersion = terms; this.privacyVersion = privacy;
        dummyHash = encoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public void register(String email, String password, String nickname, String terms, String privacy) {
        email = email(email); password(password); nickname = nickname(nickname); agreements(terms, privacy);
        limiter.check("mail:" + email, 3, 3600);
        if (!jdbc.queryForList("SELECT user_id FROM local_credential WHERE email = ?", email).isEmpty()) throw AuthFailure.conflict();
        UUID id = create(nickname, terms, privacy);
        jdbc.update("INSERT INTO local_credential(user_id,email,password_hash) VALUES (?,?,?)", id, email, encoder.encode(password));
        issue(id, email, "EMAIL_VERIFY", null);
    }

    @Transactional
    public Member login(String email, String password, String address) {
        email = email(email);
        limiter.check("login-ip:" + address, 50, 900);
        limiter.check("login:" + email, 10, 900);
        Credential credential = credential(email);
        boolean matches = password != null && password.length() <= 128 && encoder.matches(password, credential == null ? dummyHash : credential.hash());
        if (!matches || credential == null || !credential.verified()) throw AuthFailure.denied();
        Member member = lock(credential.userId()); active(member);
        jdbc.update("UPDATE app_user SET last_login_at=now() WHERE id=?", member.id());
        return member;
    }

    @Transactional
    public void requestMail(String email, String purpose) {
        email = email(email); limiter.check("mail:" + email, 3, 3600);
        Credential credential = credential(email);
        // 존재·인증 여부와 관계없이 요청 API의 성공 응답은 동일하다.
        if (credential == null || !"ACTIVE".equals(member(credential.userId()).status())) return;
        if (purpose.equals("EMAIL_VERIFY") && credential.verified()) return;
        if (purpose.equals("PASSWORD_RESET") && !credential.verified()) return;
        lock(credential.userId()); issue(credential.userId(), email, purpose, null);
    }

    @Transactional
    public void consume(String raw, String purpose, String newPassword, UUID currentUser) {
        if (purpose == null || !List.of("EMAIL_VERIFY", "PASSWORD_RESET", "LOCAL_LINK").contains(purpose)) throw AuthFailure.invalid();
        if (raw == null || !raw.matches("[A-Za-z0-9_-]{43}")) throw AuthFailure.token();
        var owners = jdbc.queryForList("SELECT user_id FROM auth_token WHERE token_hash=?", UUID.class, digest(raw));
        if (owners.isEmpty()) throw AuthFailure.token();
        Member member = lock(owners.getFirst()); active(member);
        var tokens = jdbc.queryForList("SELECT * FROM auth_token WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at > now() FOR UPDATE", digest(raw), purpose);
        if (tokens.isEmpty()) throw AuthFailure.token();
        var token = tokens.getFirst();
        if (purpose.equals("LOCAL_LINK")) {
            if (!member.id().equals(currentUser)) throw AuthFailure.denied();
            if (jdbc.queryForObject("SELECT count(*) FROM local_credential WHERE user_id=?", Integer.class, member.id()) != 0) throw AuthFailure.conflict();
            jdbc.update("INSERT INTO local_credential(user_id,email,password_hash,verified_at) VALUES (?,?,?,now())", member.id(), token.get("email"), token.get("password_hash"));
        } else if (purpose.equals("EMAIL_VERIFY")) {
            if (jdbc.update("UPDATE local_credential SET verified_at=now() WHERE user_id=? AND email=? AND verified_at IS NULL", member.id(), token.get("email")) != 1) throw AuthFailure.token();
        } else {
            password(newPassword);
            jdbc.update("UPDATE local_credential SET password_hash=?,password_changed_at=now() WHERE user_id=? AND email=?", encoder.encode(newPassword), member.id(), token.get("email"));
            revoke(member.id());
        }
        jdbc.update("UPDATE auth_token SET used_at=now(),password_hash=NULL WHERE user_id=? AND purpose=? AND used_at IS NULL", member.id(), purpose);
    }

    @Transactional
    public void reauthenticate(UUID id, String password) {
        limiter.check("reauth:" + id, 10, 900);
        Member member = lock(id); active(member);
        var credentials = jdbc.query("SELECT * FROM local_credential WHERE user_id=?", AuthService::credentialRow, id);
        if (credentials.isEmpty() || !credentials.getFirst().verified() || password == null || password.length() > 128
                || !encoder.matches(password, credentials.getFirst().hash())) throw AuthFailure.denied();
    }

    @Transactional
    public void changePassword(UUID id, String currentPassword, String newPassword) {
        reauthenticate(id, currentPassword); password(newPassword);
        jdbc.update("UPDATE local_credential SET password_hash=?,password_changed_at=now() WHERE user_id=?", encoder.encode(newPassword), id);
        jdbc.update("UPDATE auth_token SET used_at=now(),password_hash=NULL WHERE user_id=? AND used_at IS NULL", id);
        revoke(id);
    }

    @Transactional
    public void linkLocal(UUID id, String email, String password) {
        email = email(email); password(password); active(lock(id)); limiter.check("mail:" + email, 3, 3600);
        if (credential(email) != null || jdbc.queryForObject("SELECT count(*) FROM local_credential WHERE user_id=?", Integer.class, id) != 0) throw AuthFailure.conflict();
        issue(id, email, "LOCAL_LINK", encoder.encode(password));
    }

    @Transactional
    public Member oauth(String provider, String subject, String mode, UUID target, long version, String terms, String privacy) {
        if (!List.of("kakao", "naver").contains(provider) || subject == null || subject.isBlank() || subject.length() > 255) throw AuthFailure.denied();
        var owners = jdbc.queryForList("SELECT user_id FROM oauth_account WHERE provider=? AND subject=?", UUID.class, provider, subject);
        if (!mode.equals("login")) {
            Member member = lock(target); active(member);
            if (member.version() != version) throw AuthFailure.denied();
            if (mode.equals("reauth")) {
                if (owners.isEmpty() || !owners.getFirst().equals(target)) throw AuthFailure.denied();
                return member;
            }
            if (!mode.equals("link")) throw AuthFailure.invalid();
            if (!owners.isEmpty()) throw AuthFailure.conflict();
            jdbc.update("INSERT INTO oauth_account(user_id,provider,subject) VALUES (?,?,?)", target, provider, subject);
            return member;
        }
        UUID id;
        if (owners.isEmpty()) {
            agreements(terms, privacy); id = create("나들이 회원", terms, privacy);
            jdbc.update("INSERT INTO oauth_account(user_id,provider,subject) VALUES (?,?,?)", id, provider, subject);
        } else id = owners.getFirst();
        Member member = lock(id); active(member);
        jdbc.update("UPDATE app_user SET last_login_at=now() WHERE id=?", id);
        return member;
    }

    @Transactional
    public void unlink(UUID id, String provider) {
        active(lock(id));
        List<Method> methods = methods(id);
        if (methods.stream().noneMatch(m -> m.provider().equals(provider))) throw AuthFailure.invalid();
        if (methods.stream().filter(m -> !m.provider().equals(provider)).noneMatch(Method::verified)) throw new AuthFailure(409, "LAST_LOGIN_METHOD", "마지막 로그인 수단은 해제할 수 없습니다.");
        if (provider.equals("local")) {
            jdbc.update("DELETE FROM local_credential WHERE user_id=?", id);
            jdbc.update("DELETE FROM auth_token WHERE user_id=?", id);
        } else jdbc.update("DELETE FROM oauth_account WHERE user_id=? AND provider=?", id, provider);
        revoke(id);
    }

    @Transactional
    public void withdraw(UUID id) {
        active(lock(id)); revoke(id);
        jdbc.update("DELETE FROM app_user WHERE id=?", id);
    }

    @Transactional
    public void prepareRemoval(UUID id, String provider, boolean withdrawal) {
        active(lock(id));
        var methods = methods(id);
        if (withdrawal) {
            if (methods.stream().anyMatch(m -> !m.provider().equals("local") && !m.provider().equals(provider)))
                throw new AuthFailure(409, "OAUTH_DISCONNECT_REQUIRED", "다른 소셜 연결을 먼저 해제하세요.");
        } else if (methods.stream().filter(m -> !m.provider().equals(provider)).noneMatch(Method::verified))
            throw new AuthFailure(409, "LAST_LOGIN_METHOD", "마지막 로그인 수단은 해제할 수 없습니다.");
    }

    @Transactional
    public void removeOAuth(UUID id, String provider, boolean withdrawal, Runnable revokeProvider) {
        // 원격 해제 도중 다른 수단이 동시에 해제되지 않도록 회원 행 잠금을 유지한다.
        prepareRemoval(id, provider, withdrawal);
        revokeProvider.run();
        if (withdrawal) withdraw(id); else unlink(id, provider);
    }

    @Transactional
    public void revoke(UUID id) {
        lock(id);
        jdbc.update("UPDATE app_user SET auth_version=auth_version+1,updated_at=now() WHERE id=?", id);
        jdbc.update("DELETE FROM spring_session WHERE principal_name=?", id.toString());
    }

    @Transactional
    public void administer(UUID actor, UUID target, String role, String status) {
        // 현재 역할을 DB에서 다시 검사한다. 클라이언트가 보낸 역할은 신뢰하지 않는다.
        if (!member(actor).role().equals("ADMIN")) throw new AuthFailure(403, "FORBIDDEN", "권한이 없습니다.");
        if (role == null || status == null || !List.of("USER", "ADMIN").contains(role) || !List.of("ACTIVE", "SUSPENDED").contains(status)) throw AuthFailure.invalid();
        lock(target);
        jdbc.update("UPDATE app_user SET role=?,status=?,auth_version=auth_version+1,updated_at=now() WHERE id=?", role, status, target);
        jdbc.update("DELETE FROM spring_session WHERE principal_name=?", target.toString());
    }

    public Member member(UUID id) {
        var rows = jdbc.query("SELECT * FROM app_user WHERE id=?", AuthService::memberRow, id);
        if (rows.isEmpty()) throw AuthFailure.denied();
        return rows.getFirst();
    }
    private Member lock(UUID id) {
        if (id == null) throw AuthFailure.denied();
        var rows = jdbc.query("SELECT * FROM app_user WHERE id=? FOR UPDATE", AuthService::memberRow, id);
        if (rows.isEmpty()) throw AuthFailure.denied();
        return rows.getFirst();
    }
    public List<Method> methods(UUID id) {
        var result = new java.util.ArrayList<Method>();
        jdbc.query("SELECT email,verified_at FROM local_credential WHERE user_id=?", rs -> {
            result.add(new Method("local", rs.getString("email"), rs.getTimestamp("verified_at") != null));
        }, id);
        jdbc.query("SELECT provider FROM oauth_account WHERE user_id=? ORDER BY provider", rs -> {
            result.add(new Method(rs.getString("provider"), null, true));
        }, id);
        return List.copyOf(result);
    }
    public String termsVersion() { return termsVersion; }
    public String privacyVersion() { return privacyVersion; }
    void agreements(String terms, String privacy) {
        if (termsVersion.isBlank() || privacyVersion.isBlank()) throw new AuthFailure(503, "POLICY_UNAVAILABLE", "가입 정책을 준비 중입니다.");
        if (!termsVersion.equals(terms) || !privacyVersion.equals(privacy)) throw new AuthFailure(400, "CONSENT_REQUIRED", "현재 이용약관과 개인정보 처리 내용을 확인하고 동의하세요.");
    }
    private UUID create(String nickname, String terms, String privacy) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO app_user(id,nickname) VALUES (?,?)", id, nickname);
        jdbc.update("INSERT INTO user_consent(user_id,kind,version) VALUES (?,'TERMS',?),(?,'PRIVACY',?)", id, terms, id, privacy);
        return id;
    }
    private void issue(UUID id, String email, String purpose, String passwordHash) {
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update("UPDATE auth_token SET used_at=now(),password_hash=NULL WHERE user_id=? AND purpose=? AND used_at IS NULL", id, purpose);
        jdbc.update("INSERT INTO auth_token(token_hash,user_id,purpose,email,password_hash,expires_at) VALUES (?,?,?,?,?,?)", digest(raw), id, purpose, email, passwordHash,
                Timestamp.from(Instant.now().plusSeconds(purpose.equals("PASSWORD_RESET") ? 1800 : 86400)));
        mail.send(email, purpose, raw);
    }
    private Credential credential(String email) {
        var rows = jdbc.query("SELECT * FROM local_credential WHERE email=?", AuthService::credentialRow, email);
        return rows.isEmpty() ? null : rows.getFirst();
    }
    static String email(String email) {
        if (email == null) throw AuthFailure.invalid();
        String value = email.strip().toLowerCase(Locale.ROOT);
        if (value.length() > 254 || !value.matches("[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\\.[a-z]{2,}")) throw AuthFailure.invalid();
        return value;
    }
    static void password(String password) {
        // BCrypt의 72바이트 잘림을 피한다. 문자 수와 UTF-8 길이를 모두 제한한다.
        if (password == null || password.length() < 12 || password.length() > 128 || password.getBytes(StandardCharsets.UTF_8).length > 72) throw AuthFailure.invalid();
    }
    static String nickname(String nickname) {
        if (nickname == null || nickname.strip().isEmpty() || nickname.strip().length() > 40 || nickname.chars().anyMatch(Character::isISOControl)) throw AuthFailure.invalid();
        return nickname.strip();
    }
    static void active(Member member) {
        if (!member.status().equals("ACTIVE")) throw new AuthFailure(403, "ACCOUNT_SUSPENDED", "이용이 정지된 계정입니다.");
    }
    static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException failure) { throw new IllegalStateException("해시 알고리즘을 사용할 수 없습니다."); }
    }
    private static Member memberRow(ResultSet rs, int row) throws SQLException {
        return new Member(rs.getObject("id", UUID.class), rs.getString("nickname"), rs.getString("role"), rs.getString("status"), rs.getLong("auth_version"));
    }
    private static Credential credentialRow(ResultSet rs, int row) throws SQLException {
        return new Credential(rs.getObject("user_id", UUID.class), rs.getString("email"), rs.getString("password_hash"), rs.getTimestamp("verified_at") != null);
    }
}
