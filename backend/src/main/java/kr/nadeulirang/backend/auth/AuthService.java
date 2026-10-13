package kr.nadeulirang.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthService {
    record Member(UUID id, String nickname, String role, String status, long version) { }
    record Method(String provider) { }
    private final JdbcTemplate jdbc;
    private final String termsVersion;
    private final String privacyVersion;

    AuthService(JdbcTemplate jdbc,
                @Value("${auth.terms-version:}") String terms, @Value("${auth.privacy-version:}") String privacy) {
        this.jdbc = jdbc; this.termsVersion = terms; this.privacyVersion = privacy;
    }

    @Transactional
    public Member oauth(String provider, String subject, String mode, UUID target, long version, String terms, String privacy) {
        if (!List.of("kakao", "naver", "google").contains(provider) || subject == null || subject.isBlank() || subject.length() > 255) throw AuthFailure.denied();
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
        if (methods.stream().filter(m -> !m.provider().equals(provider)).findAny().isEmpty()) throw new AuthFailure(409, "LAST_LOGIN_METHOD", "마지막 로그인 수단은 해제할 수 없습니다.");
        jdbc.update("DELETE FROM oauth_account WHERE user_id=? AND provider=?", id, provider);
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
            if (methods.stream().anyMatch(m -> !m.provider().equals(provider)))
                throw new AuthFailure(409, "OAUTH_DISCONNECT_REQUIRED", "다른 소셜 연결을 먼저 해제하세요.");
        } else if (methods.stream().filter(m -> !m.provider().equals(provider)).findAny().isEmpty())
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
        jdbc.query("SELECT provider FROM oauth_account WHERE user_id=? ORDER BY provider", rs -> {
            result.add(new Method(rs.getString("provider")));
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
}
