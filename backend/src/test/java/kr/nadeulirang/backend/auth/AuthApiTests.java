package kr.nadeulirang.backend.auth;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthApiTests {
    private static final String SCHEMA = "p30_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final String PASSWORD = "test-password-123";
    private final JsonMapper json = JsonMapper.builder().build();
    private final AtomicReference<String> deliveredToken = new AtomicReference<>();
    @Autowired JdbcTemplate jdbc;
    @Autowired AuthService service;
    @MockitoBean AuthMail mail;
    @MockitoBean org.springframework.security.oauth2.client.registration.ClientRegistrationRepository registrations;
    @LocalServerPort int port;
    private com.sun.net.httpserver.HttpServer providerServer;
    private final AtomicReference<String> providerSubject = new AtomicReference<>("provider-id");
    private final java.util.concurrent.atomic.AtomicBoolean providerFailure = new java.util.concurrent.atomic.AtomicBoolean();
    private final java.util.concurrent.atomic.AtomicBoolean naverStateSent = new java.util.concurrent.atomic.AtomicBoolean();

    @BeforeAll void startProviderFixture() throws Exception {
        providerServer = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        providerServer.createContext("/", exchange -> {
            String body;
            int status = 200;
            if (exchange.getRequestURI().getPath().endsWith("token")) {
                String form = new String(exchange.getRequestBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                if (exchange.getRequestURI().getPath().contains("naver")) naverStateSent.set(form.contains("state="));
                body = "{\"access_token\":\"fixture-access\",\"token_type\":\"Bearer\",\"expires_in\":3600}";
                if (providerFailure.get()) { status = 400; body = "{\"error\":\"invalid_grant\"}"; }
            } else if (exchange.getRequestURI().getPath().contains("naver")) {
                body = json.writeValueAsString(Map.of("resultcode", "00", "response", Map.of("id", providerSubject.get(), "email", "member@example.test")));
            } else body = json.writeValueAsString(Map.of("id", providerSubject.get(), "kakao_account", Map.of("email", "member@example.test")));
            byte[] bytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
        });
        providerServer.start();
    }

    @DynamicPropertySource static void settings(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.datasource.hikari.schema", () -> SCHEMA);
        registry.add("auth.terms-version", () -> "test-v1");
        registry.add("auth.privacy-version", () -> "test-v1");
        registry.add("auth.oauth.kakao.client-id", () -> "test-client");
        registry.add("auth.oauth.kakao.client-secret", () -> "test-secret");
    }
    @BeforeEach void reset() {
        jdbc.execute("TRUNCATE app_user, spring_session, auth_rate_limit CASCADE");
        deliveredToken.set(null);
        providerSubject.set("provider-id"); providerFailure.set(false); naverStateSent.set(false);
        when(registrations.findByRegistrationId("kakao")).thenReturn(fixtureRegistration("kakao"));
        doAnswer(call -> { deliveredToken.set(call.getArgument(2)); return null; }).when(mail).send(anyString(), anyString(), anyString());
    }
    @AfterAll void cleanup() { providerServer.stop(0); jdbc.execute("DROP SCHEMA \"" + SCHEMA + "\" CASCADE"); }

    @Test @DisplayName("가입은 해시·동의를 보존하며 인증 전 로그인과 중복 이메일을 거부한다")
    void registration() throws Exception {
        try (var browser = browser()) {
            assertThat(send(browser, "POST", "register", Map.of("email", " MEMBER@example.test ", "password", PASSWORD, "nickname", "회원", "termsVersion", "test-v1", "privacyVersion", "test-v1"), true).statusCode()).isEqualTo(200);
            assertThat(jdbc.queryForObject("SELECT password_hash FROM local_credential", String.class).startsWith("$2")).isTrue();
            assertThat(jdbc.queryForObject("SELECT length(token_hash) FROM auth_token", Integer.class)).isEqualTo(64);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM user_consent", Integer.class)).isEqualTo(2);
            assertThat(send(browser, "POST", "login", Map.of("email", "member@example.test", "password", PASSWORD), true).statusCode()).isEqualTo(401);
            assertThat(send(browser, "POST", "register", registrationBody("member@example.test"), true).statusCode()).isEqualTo(409);
            assertThat(send(browser, "POST", "token/consume", Map.of("token", deliveredToken.get(), "purpose", "EMAIL_VERIFY"), true).statusCode()).isEqualTo(200);
            assertThat(send(browser, "POST", "login", Map.of("email", "member@example.test", "password", PASSWORD), true).statusCode()).isEqualTo(200);
            var me = send(browser, "GET", "me", null, false);
            assertThat(me.statusCode()).isEqualTo(200);
            assertThat(json.readTree(me.body()).path("role").asText()).isEqualTo("USER");
        }
    }
    @Test @DisplayName("트랜잭션 프록시를 경유한 옵션 조회는 정책 버전·설정된 제공자를 반환한다")
    void configuredOptions() throws Exception {
        try (var browser = browser()) {
            var result = send(browser, "GET", "options", null, false);
            assertThat(result.statusCode()).isEqualTo(200);
            var options = json.readTree(result.body());
            assertThat(options.path("termsVersion").asText()).isEqualTo("test-v1");
            assertThat(options.path("privacyVersion").asText()).isEqualTo("test-v1");
            assertThat(options.path("providers").size()).isEqualTo(1);
            assertThat(send(browser, "POST", "token/consume", Map.of(), true).statusCode()).isEqualTo(400);
            assertThat(send(browser, "POST", "oauth/kakao/start", Map.of(), true).statusCode()).isEqualTo(400);
        }
    }
    @Test @DisplayName("인증 토큰은 재발급·만료·사용 뒤 재사용을 거부한다")
    void tokenLifecycle() {
        service.register("member@example.test", PASSWORD, "회원", "test-v1", "test-v1");
        String old = deliveredToken.get();
        service.requestMail("member@example.test", "EMAIL_VERIFY");
        assertThatThrownBy(() -> service.consume(old, "EMAIL_VERIFY", null, null)).isInstanceOf(AuthFailure.class);
        String fresh = deliveredToken.get();
        jdbc.update("UPDATE auth_token SET expires_at=now()-interval '1 second' WHERE used_at IS NULL");
        assertThatThrownBy(() -> service.consume(fresh, "EMAIL_VERIFY", null, null)).isInstanceOf(AuthFailure.class);
        service.requestMail("member@example.test", "EMAIL_VERIFY");
        String finalToken = deliveredToken.get();
        service.consume(finalToken, "EMAIL_VERIFY", null, null);
        assertThatThrownBy(() -> service.consume(finalToken, "EMAIL_VERIFY", null, null)).isInstanceOf(AuthFailure.class);
    }
    @Test @DisplayName("로그인 실패·로그인 자체·로그아웃에도 CSRF를 검사하고 세션 ID를 교체한다")
    void csrfAndRotation() throws Exception {
        member("member@example.test");
        try (var browser = browser()) {
            var boot = send(browser, "GET", "csrf", null, false);
            assertThat(boot.headers().firstValue("set-cookie").orElse("")).contains("HttpOnly", "SameSite=Lax");
            String firstCookie = cookie(browser);
            assertThat(send(browser, "POST", "login", Map.of("email", "member@example.test", "password", PASSWORD), false).statusCode()).isEqualTo(403);
            assertThat(send(browser, "POST", "login", Map.of("email", "member@example.test", "password", "incorrect"), true).statusCode()).isEqualTo(401);
            login(browser, "member@example.test");
            assertThat(cookie(browser).equals(firstCookie)).isFalse();
            assertThat(send(browser, "POST", "logout", Map.of(), false).statusCode()).isEqualTo(403);
            assertThat(send(browser, "POST", "logout", Map.of(), true).statusCode()).isEqualTo(200);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }
    @Test @DisplayName("전체 세션 종료와 비밀번호 복구는 다른 기기의 기존 세션도 무효화한다")
    void allSessionsAndReset() throws Exception {
        member("member@example.test");
        try (var first = browser(); var second = browser()) {
            login(first, "member@example.test"); login(second, "member@example.test");
            assertThat(send(first, "POST", "sessions/end-all", Map.of(), true).statusCode()).isEqualTo(200);
            assertThat(send(second, "GET", "me", null, false).statusCode()).isEqualTo(401);
            login(first, "member@example.test"); login(second, "member@example.test");
            service.requestMail("member@example.test", "PASSWORD_RESET");
            String raw = deliveredToken.get();
            service.consume(raw, "PASSWORD_RESET", "changed-password-123", null);
            assertThat(send(second, "GET", "me", null, false).statusCode()).isEqualTo(401);
            assertThatThrownBy(() -> service.consume(raw, "PASSWORD_RESET", "changed-password-123", null)).isInstanceOf(AuthFailure.class);
            assertThatThrownBy(() -> service.login("member@example.test", PASSWORD, "test")).isInstanceOf(AuthFailure.class);
            assertThat(service.login("member@example.test", "changed-password-123", "test").role()).isEqualTo("USER");
        }
    }
    @Test @DisplayName("정지·역할 회수·절대 만료는 이미 로그인한 세션에 반영된다")
    void stateAndExpiry() throws Exception {
        UUID id = member("member@example.test");
        try (var browser = browser()) {
            login(browser, "member@example.test");
            jdbc.update("UPDATE app_user SET status='SUSPENDED' WHERE id=?", id);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
            jdbc.update("UPDATE app_user SET status='ACTIVE',role='ADMIN' WHERE id=?", id);
            login(browser, "member@example.test");
            jdbc.update("UPDATE app_user SET role='USER' WHERE id=?", id);
            assertThat(send(browser, "PATCH", "admin/users/" + id, Map.of("role", "ADMIN", "status", "ACTIVE"), true).statusCode()).isEqualTo(403);
            jdbc.update("UPDATE spring_session SET expiry_time=0,last_access_time=0");
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }
    @Test @DisplayName("소셜 이메일로 자동 합치지 않고 기존 회원·새 수단 인증과 마지막 수단을 보호한다")
    void linkingAndLastMethod() {
        UUID local = member("member@example.test");
        var social = service.oauth("kakao", "social-id", "login", null, -1, "test-v1", "test-v1");
        assertThat(social.id()).isNotEqualTo(local);
        assertThatThrownBy(() -> service.oauth("kakao", "social-id", "link", local, 0, null, null)).isInstanceOf(AuthFailure.class);
        service.oauth("naver", "new-id", "link", local, 0, null, null);
        assertThat(service.methods(local)).hasSize(2);
        assertThatThrownBy(() -> service.oauth("naver", "other-id", "reauth", local, 0, null, null)).isInstanceOf(AuthFailure.class);
        service.unlink(local, "local");
        assertThatThrownBy(() -> service.unlink(local, "naver")).isInstanceOf(AuthFailure.class);
        assertThatThrownBy(() -> service.oauth("kakao", "unused", "link", local, 0, null, null)).isInstanceOf(AuthFailure.class);
    }
    @Test @DisplayName("자체 수단 연결은 이메일 소유·기존 회원을 검사하고 다른 회원의 토큰을 거부한다")
    void localLink() {
        var social = service.oauth("naver", "social-id", "login", null, -1, "test-v1", "test-v1");
        UUID other = member("other@example.test");
        service.linkLocal(social.id(), "new@example.test", PASSWORD);
        String raw = deliveredToken.get();
        assertThatThrownBy(() -> service.consume(raw, "LOCAL_LINK", null, other)).isInstanceOf(AuthFailure.class);
        service.consume(raw, "LOCAL_LINK", null, social.id());
        assertThat(service.methods(social.id())).hasSize(2);
    }
    @Test @DisplayName("최근 재인증이 없는 연결·탈퇴는 거부하고 재인증 뒤 회원 자료를 삭제한다")
    void reauthAndWithdraw() throws Exception {
        UUID id = member("member@example.test");
        try (var browser = browser()) {
            login(browser, "member@example.test");
            jdbc.update("DELETE FROM spring_session_attributes WHERE attribute_name='MEMBER_REAUTH_AT'");
            assertThat(send(browser, "DELETE", "me", Map.of(), true).statusCode()).isEqualTo(403);
            assertThat(send(browser, "POST", "reauthenticate", Map.of("password", PASSWORD), true).statusCode()).isEqualTo(200);
            assertThat(send(browser, "DELETE", "me", Map.of(), true).statusCode()).isEqualTo(200);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM app_user WHERE id=?", Integer.class, id)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM local_credential", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_token", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM user_consent", Integer.class)).isZero();
        }
    }
    @Test @DisplayName("동의 누락·메일 실패는 가입을 롤백하고 복구 요청은 없는 계정을 노출하지 않는다")
    void failureAndPrivacy() throws Exception {
        assertThatThrownBy(() -> service.register("member@example.test", PASSWORD, "회원", "old", "test-v1")).isInstanceOf(AuthFailure.class);
        doThrow(new AuthFailure(503, "MAIL_UNAVAILABLE", "메일 발송 실패")).when(mail).send(anyString(), anyString(), anyString());
        assertThatThrownBy(() -> service.register("member@example.test", PASSWORD, "회원", "test-v1", "test-v1")).isInstanceOf(AuthFailure.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_user", Integer.class)).isZero();
        try (var browser = browser()) {
            assertThat(send(browser, "POST", "password/reset-request", Map.of("email", "missing@example.test"), true).statusCode()).isEqualTo(200);
        }
    }
    @Test @DisplayName("실패 시도 한도는 롤백·서버 재시작과 독립적으로 DB에 남는다")
    void limits() {
        for (int i = 0; i < 10; i++) assertThatThrownBy(() -> service.login("missing@example.test", PASSWORD, "test")).isInstanceOf(AuthFailure.class);
        assertThatThrownBy(() -> service.login("missing@example.test", PASSWORD, "test")).isInstanceOf(AuthRateLimiter.LimitExceeded.class);
        assertThat(jdbc.queryForObject("SELECT max(attempts) FROM auth_rate_limit", Integer.class)).isEqualTo(11);
    }
    @Test @DisplayName("소셜 시작은 POST·CSRF로 제한하고 실제 콜백 URI·state·재인증 매개변수를 유지한다")
    void oauthStartAndState() throws Exception {
        try (var browser = browser()) {
            assertThat(send(browser, "POST", "oauth/kakao/start", Map.of("mode", "link"), true).statusCode()).isEqualTo(401);
            assertThat(send(browser, "POST", "oauth/naver/start", Map.of("mode", "login"), true).statusCode()).isEqualTo(503);
            assertThat(send(browser, "POST", "oauth/kakao/start", Map.of("mode", "login", "termsVersion", "test-v1", "privacyVersion", "test-v1"), true).statusCode()).isEqualTo(200);
            var authorization = send(browser, "GET", "oauth2/authorization/kakao", null, false);
            assertThat(authorization.statusCode()).isEqualTo(302);
            String location = authorization.headers().firstValue("location").orElseThrow();
            assertThat(location.contains("state=")).isTrue();
            assertThat(location.contains("prompt=login")).isTrue();
            assertThat(location.contains("localhost:3000") || location.contains("localhost%3A3000")).isTrue();
            var forged = browser.send(HttpRequest.newBuilder(URI.create(base() + "login/oauth2/code/kakao?code=invalid&state=invalid")).GET().build(), HttpResponse.BodyHandlers.ofString());
            assertThat(forged.statusCode()).isEqualTo(302);
            assertThat(forged.headers().firstValue("location").orElseThrow()).isEqualTo("/account#error");
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }
    @Test @DisplayName("제공자 프로필은 고유 ID만 쓰며 누락·오류 응답과 이메일 합치기를 배제한다")
    void providerIdentity() {
        var user = OAuthConfiguration.identity("naver", Map.of("resultcode", "00", "response", Map.of("id", "provider-id", "email", "member@example.test")));
        assertThat(user.getAttributes()).containsOnlyKeys("sub", "provider");
        assertThatThrownBy(() -> OAuthConfiguration.identity("naver", Map.of("resultcode", "01"))).isInstanceOf(org.springframework.security.oauth2.core.OAuth2AuthenticationException.class);
        assertThatThrownBy(() -> OAuthConfiguration.identity("kakao", Map.of())).isInstanceOf(org.springframework.security.oauth2.core.OAuth2AuthenticationException.class);
    }

    @Test @DisplayName("비밀번호 변경은 현재 인증을 요구하고 모든 세션과 이전 복구 토큰을 무효화한다")
    void passwordChange() throws Exception {
        UUID id = member("member@example.test");
        try (var browser = browser()) {
            login(browser, "member@example.test");
            service.requestMail("member@example.test", "PASSWORD_RESET");
            String old = deliveredToken.get();
            assertThatThrownBy(() -> service.changePassword(id, "incorrect", "changed-password-123")).isInstanceOf(AuthFailure.class);
            service.changePassword(id, PASSWORD, "changed-password-123");
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
            assertThatThrownBy(() -> service.consume(old, "PASSWORD_RESET", "changed-password-456", null)).isInstanceOf(AuthFailure.class);
        }
    }
    @Test @DisplayName("두 수단의 동시 해제와 같은 토큰의 동시 소비는 하나만 성공한다")
    void concurrentChanges() throws Exception {
        UUID id = member("member@example.test");
        service.oauth("kakao", "social-id", "link", id, 0, null, null);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> attempt(() -> service.unlink(id, "local")));
            var second = executor.submit(() -> attempt(() -> service.unlink(id, "kakao")));
            assertThat((first.get() ? 1 : 0) + (second.get() ? 1 : 0)).isEqualTo(1);
            assertThat(service.methods(id)).hasSize(1);
            service.register("next@example.test", PASSWORD, "회원", "test-v1", "test-v1");
            String raw = deliveredToken.get();
            var one = executor.submit(() -> attempt(() -> service.consume(raw, "EMAIL_VERIFY", null, null)));
            var two = executor.submit(() -> attempt(() -> service.consume(raw, "EMAIL_VERIFY", null, null)));
            assertThat((one.get() ? 1 : 0) + (two.get() ? 1 : 0)).isEqualTo(1);
        }
    }
    @Test @DisplayName("서버 절대 로그인 만료를 검사하고 관리자는 역할·정지 변경 시 세션을 회수한다")
    void absoluteExpiryAndAdmin() throws Exception {
        UUID admin = member("admin@example.test");
        UUID user = member("member@example.test");
        jdbc.update("UPDATE app_user SET role='ADMIN' WHERE id=?", admin);
        try (var browser = browser(); var other = browser()) {
            login(browser, "admin@example.test"); login(other, "member@example.test");
            assertThat(send(browser, "PATCH", "admin/users/" + user, Map.of("role", "USER", "status", "SUSPENDED"), true).statusCode()).isEqualTo(200);
            assertThat(send(other, "GET", "me", null, false).statusCode()).isEqualTo(401);
            byte[] stale = org.springframework.util.SerializationUtils.serialize(Instant.now().minusSeconds(43201).getEpochSecond());
            jdbc.update("UPDATE spring_session_attributes SET attribute_bytes=? WHERE attribute_name='MEMBER_LOGIN_AT'", stale);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test @DisplayName("회수된 세션이 남은 방문도 공개 목록은 익명으로 이용할 수 있다")
    void revokedSessionPublicAccess() throws Exception {
        UUID id = member("member@example.test");
        try (var browser = browser()) {
            login(browser, "member@example.test");
            jdbc.update("UPDATE app_user SET auth_version=auth_version+1 WHERE id=?", id);
            var publicPage = browser.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/outings")).GET().build(), HttpResponse.BodyHandlers.ofString());
            assertThat(publicPage.statusCode()).isEqualTo(200);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test @DisplayName("대체 제공자의 실제 HTTP 코드 교환·프로필 조회·콜백으로 소셜 가입·연결·재인증을 검증한다")
    void oauthCallbackFixture() throws Exception {
        UUID local = member("member@example.test");
        when(registrations.findByRegistrationId("naver")).thenReturn(fixtureRegistration("naver"));
        try (var browser = browser()) {
            assertThat(callback(browser, "kakao", "login").headers().firstValue("location").orElseThrow()).isEqualTo("/account#completed");
            UUID social = UUID.fromString(json.readTree(send(browser, "GET", "me", null, false).body()).path("id").asText());
            assertThat(social).isNotEqualTo(local);
            assertThat(service.methods(social)).hasSize(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM spring_session WHERE principal_name=?", Integer.class, social.toString())).isEqualTo(1);
            assertThat(callback(browser, "naver", "link").headers().firstValue("location").orElseThrow()).isEqualTo("/account#completed");
            assertThat(service.methods(social)).hasSize(2);
            assertThat(naverStateSent.get()).isTrue();
            assertThat(callback(browser, "naver", "reauth").headers().firstValue("location").orElseThrow()).isEqualTo("/account#completed");
            providerSubject.set("wrong-account");
            assertThat(callback(browser, "naver", "reauth").headers().firstValue("location").orElseThrow()).isEqualTo("/account#error");
            assertThat(service.methods(social)).hasSize(2);
        }
    }
    @Test @DisplayName("제공자 코드 교환 실패는 회원을 만들지 않고 원격 해제 실패는 로컬 수단을 보존한다")
    void oauthFailureAndRemoval() throws Exception {
        try (var browser = browser()) {
            providerFailure.set(true);
            assertThat(callback(browser, "kakao", "login").headers().firstValue("location").orElseThrow()).isEqualTo("/account#error");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM app_user", Integer.class)).isZero();
        }
        UUID local = member("member@example.test");
        service.oauth("kakao", "provider-id", "link", local, 0, null, null);
        assertThatThrownBy(() -> service.removeOAuth(local, "kakao", false, () -> { throw new IllegalStateException("원격 연결 해제 실패"); })).isInstanceOf(IllegalStateException.class);
        assertThat(service.methods(local)).hasSize(2);
        service.removeOAuth(local, "kakao", false, () -> { });
        assertThat(service.methods(local)).hasSize(1);
    }
    private org.springframework.security.oauth2.client.registration.ClientRegistration fixtureRegistration(String provider) {
        return org.springframework.security.oauth2.client.registration.ClientRegistration.withRegistrationId(provider)
            .clientId("fixture-client").clientSecret("fixture-secret")
            .clientAuthenticationMethod(org.springframework.security.oauth2.core.ClientAuthenticationMethod.CLIENT_SECRET_POST)
            .authorizationGrantType(org.springframework.security.oauth2.core.AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationUri(provider.equals("kakao") ? "https://kauth.kakao.com/oauth/authorize" : "https://nid.naver.com/oauth2.0/authorize")
            .tokenUri("http://127.0.0.1:" + providerServer.getAddress().getPort() + "/" + provider + "/token")
            .userInfoUri("http://127.0.0.1:" + providerServer.getAddress().getPort() + "/" + provider + "/me")
            .userNameAttributeName(provider.equals("kakao") ? "id" : "response")
            .redirectUri("http://localhost:3000/api/auth/login/oauth2/code/" + provider).build();
    }
    private HttpResponse<String> callback(HttpClient browser, String provider, String mode) throws Exception {
        assertThat(send(browser, "POST", "oauth/" + provider + "/start", Map.of("mode", mode, "termsVersion", "test-v1", "privacyVersion", "test-v1"), true).statusCode()).isEqualTo(200);
        String location = send(browser, "GET", "oauth2/authorization/" + provider, null, false).headers().firstValue("location").orElseThrow();
        String state = java.util.Arrays.stream(URI.create(location).getRawQuery().split("&")).filter(pair -> pair.startsWith("state=")).findFirst().orElseThrow().substring(6);
        return browser.send(HttpRequest.newBuilder(URI.create(base() + "login/oauth2/code/" + provider + "?code=fixture-code&state=" + state)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private boolean attempt(Runnable action) { try { action.run(); return true; } catch (AuthFailure failure) { return false; } }

    private UUID member(String email) {
        service.register(email, PASSWORD, "회원", "test-v1", "test-v1");
        service.consume(deliveredToken.get(), "EMAIL_VERIFY", null, null);
        return jdbc.queryForObject("SELECT user_id FROM local_credential WHERE email=?", UUID.class, email);
    }
    private Map<String, String> registrationBody(String email) { return Map.of("email", email, "password", PASSWORD, "nickname", "회원", "termsVersion", "test-v1", "privacyVersion", "test-v1"); }
    private HttpClient browser() { return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build(); }
    private String base() { return "http://127.0.0.1:" + port + "/api/auth/"; }
    private String cookie(HttpClient browser) { return ((CookieManager) browser.cookieHandler().orElseThrow()).getCookieStore().getCookies().getFirst().getValue(); }
    private void login(HttpClient browser, String email) throws Exception { assertThat(send(browser, "POST", "login", Map.of("email", email, "password", PASSWORD), true).statusCode()).isEqualTo(200); }
    private HttpResponse<String> send(HttpClient browser, String method, String path, Object body, boolean csrf) throws Exception {
        String token = null;
        if (csrf) token = json.readTree(send(browser, "GET", "csrf", null, false).body()).path("token").asText();
        var builder = HttpRequest.newBuilder(URI.create(base() + path));
        if (token != null) builder.header("X-CSRF-TOKEN", token);
        if (body != null) builder.header("Content-Type", "application/json");
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return browser.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
