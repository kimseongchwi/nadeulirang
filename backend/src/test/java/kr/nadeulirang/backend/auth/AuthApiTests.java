package kr.nadeulirang.backend.auth;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.session.jdbc.cleanup-cron=-")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthApiTests {
    private static final String SCHEMA =
            "p30_test_" + UUID.randomUUID().toString().replace("-", "");
    private final JsonMapper json = JsonMapper.builder().build();
    @Autowired JdbcTemplate jdbc;
    @Autowired AuthService service;
    @Autowired AuthRateLimiter limiter;
    @Autowired JdbcIndexedSessionRepository sessions;

    @MockitoBean
    org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
            registrations;

    @LocalServerPort int port;
    private com.sun.net.httpserver.HttpServer providerServer;
    private com.nimbusds.jose.jwk.RSAKey googleKey;
    private final AtomicReference<String> googleNonce = new AtomicReference<>("");
    private final AtomicReference<String> googleInvalidClaim = new AtomicReference<>("");
    private final AtomicReference<String> providerSubject = new AtomicReference<>("provider-id");
    private final java.util.concurrent.atomic.AtomicBoolean providerFailure =
            new java.util.concurrent.atomic.AtomicBoolean();
    private final java.util.concurrent.atomic.AtomicBoolean naverStateSent =
            new java.util.concurrent.atomic.AtomicBoolean();

    @BeforeAll
    void startProviderFixture() throws Exception {
        googleKey =
                new com.nimbusds.jose.jwk.gen.RSAKeyGenerator(2048).keyID("fixture-key").generate();
        providerServer =
                com.sun.net.httpserver.HttpServer.create(
                        new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        providerServer.createContext(
                "/",
                exchange -> {
                    String body;
                    int status = 200;
                    if (exchange.getRequestURI().getPath().endsWith("jwks")) {
                        body = new com.nimbusds.jose.jwk.JWKSet(googleKey.toPublicJWK()).toString();
                    } else if (exchange.getRequestURI().getPath().endsWith("token")) {
                        String form =
                                new String(
                                        exchange.getRequestBody().readAllBytes(),
                                        java.nio.charset.StandardCharsets.UTF_8);
                        if (exchange.getRequestURI().getPath().contains("naver"))
                            naverStateSent.set(form.contains("state="));
                        body =
                                "{\"access_token\":\"fixture-access\",\"token_type\":\"Bearer\",\"expires_in\":3600}";
                        if (exchange.getRequestURI().getPath().contains("google"))
                            body = googleToken();
                        if (providerFailure.get()) {
                            status = 400;
                            body = "{\"error\":\"invalid_grant\"}";
                        }
                    } else if (exchange.getRequestURI().getPath().contains("naver")) {
                        body =
                                json.writeValueAsString(
                                        Map.of(
                                                "resultcode",
                                                "00",
                                                "response",
                                                Map.of(
                                                        "id",
                                                        providerSubject.get(),
                                                        "email",
                                                        "member@example.test")));
                    } else if (exchange.getRequestURI().getPath().contains("google")) {
                        body = json.writeValueAsString(Map.of("sub", providerSubject.get()));
                    } else
                        body =
                                json.writeValueAsString(
                                        Map.of(
                                                "id",
                                                providerSubject.get(),
                                                "kakao_account",
                                                Map.of("email", "member@example.test")));
                    byte[] bytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(status, bytes.length);
                    exchange.getResponseBody().write(bytes);
                    exchange.close();
                });
        providerServer.start();
    }

    @DynamicPropertySource
    static void settings(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.datasource.hikari.schema", () -> SCHEMA);
        registry.add("auth.terms-version", () -> "test-v1");
        registry.add("auth.privacy-version", () -> "test-v1");
        registry.add("auth.oauth.kakao.client-id", () -> "test-client");
        registry.add("auth.oauth.kakao.client-secret", () -> "test-secret");
    }

    @BeforeEach
    void reset() {
        jdbc.execute("TRUNCATE app_user, spring_session, auth_rate_limit CASCADE");
        googleInvalidClaim.set("");
        providerSubject.set("provider-id");
        providerFailure.set(false);
        naverStateSent.set(false);
        when(registrations.findByRegistrationId("kakao")).thenReturn(fixtureRegistration("kakao"));
    }

    @AfterAll
    void cleanup() {
        providerServer.stop(0);
        jdbc.execute("DROP SCHEMA \"" + SCHEMA + "\" CASCADE");
    }

    @Test
    @DisplayName("트랜잭션 프록시를 경유한 옵션 조회는 정책 버전·설정된 제공자를 반환한다")
    void configuredOptions() throws Exception {
        try (var browser = browser()) {
            var result = send(browser, "GET", "options", null, false);
            assertThat(result.statusCode()).isEqualTo(200);
            var options = json.readTree(result.body());
            assertThat(options.path("termsVersion").asText()).isEqualTo("test-v1");
            assertThat(options.path("privacyVersion").asText()).isEqualTo("test-v1");
            assertThat(options.path("providers").size()).isEqualTo(1);
            assertThat(send(browser, "POST", "token/consume", Map.of(), true).statusCode())
                    .isEqualTo(401);
            assertThat(send(browser, "POST", "oauth/kakao/start", Map.of(), true).statusCode())
                    .isEqualTo(400);
        }
    }

    @Test
    @DisplayName("소셜 시작·로그아웃에 CSRF를 검사하고 로그인 시 세션 ID를 교체한다")
    void csrfAndRotation() throws Exception {
        member("member@example.test");
        try (var browser = browser()) {
            var boot = send(browser, "GET", "csrf", null, false);
            assertThat(boot.headers().firstValue("set-cookie").orElse(""))
                    .contains("HttpOnly", "SameSite=Lax");
            String firstCookie = cookie(browser);
            assertThat(
                            send(
                                            browser,
                                            "POST",
                                            "oauth/kakao/start",
                                            Map.of("mode", "login"),
                                            false)
                                    .statusCode())
                    .isEqualTo(403);
            login(browser, "member@example.test");
            assertThat(cookie(browser).equals(firstCookie)).isFalse();
            assertThat(send(browser, "POST", "logout", Map.of(), false).statusCode())
                    .isEqualTo(403);
            assertThat(send(browser, "POST", "logout", Map.of(), true).statusCode()).isEqualTo(200);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("전체 세션 종료는 다른 기기의 기존 세션도 무효화한다")
    void allSessions() throws Exception {
        member("member@example.test");
        try (var first = browser();
                var second = browser()) {
            login(first, "member@example.test");
            login(second, "member@example.test");
            assertThat(send(first, "POST", "sessions/end-all", Map.of(), true).statusCode())
                    .isEqualTo(200);
            assertThat(send(second, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("정지·역할 회수·절대 만료는 이미 로그인한 세션에 반영된다")
    void stateAndExpiry() throws Exception {
        UUID id = member("member@example.test");
        try (var browser = browser()) {
            login(browser, "member@example.test");
            jdbc.update("UPDATE app_user SET status='SUSPENDED' WHERE id=?", id);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
            jdbc.update("UPDATE app_user SET status='ACTIVE',role='ADMIN' WHERE id=?", id);
            login(browser, "member@example.test");
            jdbc.update("UPDATE app_user SET role='USER' WHERE id=?", id);
            assertThat(
                            send(
                                            browser,
                                            "PATCH",
                                            "admin/users/" + id,
                                            Map.of("role", "ADMIN", "status", "ACTIVE"),
                                            true)
                                    .statusCode())
                    .isEqualTo(403);
            jdbc.update("UPDATE spring_session SET expiry_time=0,last_access_time=0");
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("세션 정리는 만료 세션과 속성만 삭제하고 정상 세션은 보존한다")
    void cleansUpOnlyExpiredSessions() throws Exception {
        member("member@example.test");
        try (var expired = browser();
                var active = browser()) {
            login(expired, "member@example.test");
            String expiredId =
                    jdbc.queryForObject("SELECT primary_id FROM spring_session", String.class);
            login(active, "member@example.test");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM spring_session", Integer.class))
                    .isEqualTo(2);
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM spring_session_attributes WHERE session_primary_id=?",
                                    Integer.class,
                                    expiredId))
                    .isPositive();
            jdbc.update(
                    "UPDATE spring_session SET expiry_time=0,last_access_time=0 WHERE primary_id=?",
                    expiredId);

            sessions.cleanUpExpiredSessions();

            assertThat(jdbc.queryForObject("SELECT count(*) FROM spring_session", Integer.class))
                    .isEqualTo(1);
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM spring_session_attributes WHERE session_primary_id=?",
                                    Integer.class,
                                    expiredId))
                    .isZero();
            assertThat(send(active, "GET", "me", null, false).statusCode()).isEqualTo(200);
            assertThat(send(expired, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("소셜 이메일로 자동 합치지 않고 기존 회원·새 수단 인증과 마지막 수단을 보호한다")
    void linkingAndLastMethod() {
        UUID existing = member("member@example.test");
        var social = service.oauth("google", "social-id", "login", null, -1, "test-v1", "test-v1");
        assertThat(social.id()).isNotEqualTo(existing);
        assertThatThrownBy(
                        () -> service.oauth("google", "social-id", "link", existing, 0, null, null))
                .isInstanceOf(AuthFailure.class);
        service.oauth("naver", "new-id", "link", existing, 0, null, null);
        assertThat(service.methods(existing)).hasSize(2);
        assertThatThrownBy(
                        () -> service.oauth("naver", "other-id", "reauth", existing, 0, null, null))
                .isInstanceOf(AuthFailure.class);
        service.unlink(existing, "kakao");
        assertThatThrownBy(() -> service.unlink(existing, "naver")).isInstanceOf(AuthFailure.class);
        assertThatThrownBy(() -> service.oauth("kakao", "unused", "link", existing, 0, null, null))
                .isInstanceOf(AuthFailure.class);
    }

    @Test
    @DisplayName("최근 재인증이 없는 연결·탈퇴는 거부하고 재인증 뒤 회원 자료를 삭제한다")
    void reauthAndWithdraw() throws Exception {
        UUID id = member("member@example.test");
        try (var browser = browser()) {
            login(browser, "member@example.test");
            jdbc.update(
                    "DELETE FROM spring_session_attributes WHERE attribute_name='MEMBER_REAUTH_AT'");
            assertThat(
                            send(
                                            browser,
                                            "POST",
                                            "oauth/kakao/start",
                                            Map.of("mode", "withdraw"),
                                            true)
                                    .statusCode())
                    .isEqualTo(403);
            assertThat(
                            callback(browser, "kakao", "reauth")
                                    .headers()
                                    .firstValue("location")
                                    .orElseThrow())
                    .isEqualTo("/login#completed");
            service.removeOAuth(id, "kakao", true, () -> {});
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM app_user WHERE id=?", Integer.class, id))
                    .isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM local_credential", Integer.class))
                    .isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_token", Integer.class))
                    .isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM user_consent", Integer.class))
                    .isZero();
        }
    }

    @Test
    @DisplayName("소셜 인증 시작 한도는 DB에 기록하고 초과 요청을 거부한다")
    void limits() {
        for (int i = 0; i < 10; i++) limiter.check("oauth-start:test", 10, 900);
        assertThatThrownBy(() -> limiter.check("oauth-start:test", 10, 900))
                .isInstanceOf(AuthRateLimiter.LimitExceeded.class);
        assertThat(jdbc.queryForObject("SELECT max(attempts) FROM auth_rate_limit", Integer.class))
                .isEqualTo(11);
    }

    @Test
    @DisplayName("소셜 시작은 POST·CSRF로 제한하고 실제 콜백 URI·state·재인증 매개변수를 유지한다")
    void oauthStartAndState() throws Exception {
        try (var browser = browser()) {
            assertThat(
                            send(browser, "POST", "oauth/kakao/start", Map.of("mode", "link"), true)
                                    .statusCode())
                    .isEqualTo(401);
            assertThat(
                            send(
                                            browser,
                                            "POST",
                                            "oauth/naver/start",
                                            Map.of("mode", "login"),
                                            true)
                                    .statusCode())
                    .isEqualTo(503);
            assertThat(
                            send(
                                            browser,
                                            "POST",
                                            "oauth/kakao/start",
                                            Map.of(
                                                    "mode",
                                                    "login",
                                                    "termsVersion",
                                                    "test-v1",
                                                    "privacyVersion",
                                                    "test-v1"),
                                            true)
                                    .statusCode())
                    .isEqualTo(200);
            var authorization = send(browser, "GET", "oauth2/authorization/kakao", null, false);
            assertThat(authorization.statusCode()).isEqualTo(302);
            String location = authorization.headers().firstValue("location").orElseThrow();
            assertThat(location.contains("state=")).isTrue();
            assertThat(location.contains("prompt=login")).isTrue();
            assertThat(location.contains("localhost:3000") || location.contains("localhost%3A3000"))
                    .isTrue();
            var forged =
                    browser.send(
                            HttpRequest.newBuilder(
                                            URI.create(
                                                    base()
                                                            + "login/oauth2/code/kakao?code=invalid&state=invalid"))
                                    .GET()
                                    .build(),
                            HttpResponse.BodyHandlers.ofString());
            assertThat(forged.statusCode()).isEqualTo(302);
            assertThat(forged.headers().firstValue("location").orElseThrow())
                    .isEqualTo("/login#error");
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("제공자 프로필은 고유 ID만 쓰며 누락·오류 응답과 이메일 합치기를 배제한다")
    void providerIdentity() {
        var user =
                OAuthConfiguration.identity(
                        "naver",
                        Map.of(
                                "resultcode",
                                "00",
                                "response",
                                Map.of("id", "provider-id", "email", "member@example.test")));
        assertThat(user.getAttributes()).containsOnlyKeys("sub", "provider");
        assertThatThrownBy(() -> OAuthConfiguration.identity("naver", Map.of("resultcode", "01")))
                .isInstanceOf(
                        org.springframework.security.oauth2.core.OAuth2AuthenticationException
                                .class);
        assertThatThrownBy(() -> OAuthConfiguration.identity("kakao", Map.of()))
                .isInstanceOf(
                        org.springframework.security.oauth2.core.OAuth2AuthenticationException
                                .class);
    }

    @Test
    @DisplayName("두 소셜 수단의 동시 해제는 하나만 성공하고 마지막 수단을 보존한다")
    void concurrentChanges() throws Exception {
        UUID id = member("member@example.test");
        service.oauth("naver", "social-id", "link", id, 0, null, null);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> attempt(() -> service.unlink(id, "kakao")));
            var second = executor.submit(() -> attempt(() -> service.unlink(id, "naver")));
            assertThat((first.get() ? 1 : 0) + (second.get() ? 1 : 0)).isEqualTo(1);
            assertThat(service.methods(id)).hasSize(1);
        }
    }

    @Test
    @DisplayName("서버 절대 로그인 만료를 검사하고 관리자는 역할·정지 변경 시 세션을 회수한다")
    void absoluteExpiryAndAdmin() throws Exception {
        UUID admin = member("admin@example.test");
        UUID user = member("member@example.test");
        jdbc.update("UPDATE app_user SET role='ADMIN' WHERE id=?", admin);
        try (var browser = browser();
                var other = browser()) {
            login(browser, "admin@example.test");
            login(other, "member@example.test");
            assertThat(
                            send(
                                            browser,
                                            "PATCH",
                                            "admin/users/" + user,
                                            Map.of("role", "USER", "status", "SUSPENDED"),
                                            true)
                                    .statusCode())
                    .isEqualTo(200);
            assertThat(send(other, "GET", "me", null, false).statusCode()).isEqualTo(401);
            byte[] stale =
                    org.springframework.util.SerializationUtils.serialize(
                            Instant.now().minusSeconds(43201).getEpochSecond());
            jdbc.update(
                    "UPDATE spring_session_attributes SET attribute_bytes=? WHERE attribute_name='MEMBER_LOGIN_AT'",
                    stale);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("회수된 세션이 남은 방문도 공개 목록은 익명으로 이용할 수 있다")
    void revokedSessionPublicAccess() throws Exception {
        UUID id = member("member@example.test");
        try (var browser = browser()) {
            login(browser, "member@example.test");
            jdbc.update("UPDATE app_user SET auth_version=auth_version+1 WHERE id=?", id);
            var publicPage =
                    browser.send(
                            HttpRequest.newBuilder(
                                            URI.create("http://127.0.0.1:" + port + "/api/outings"))
                                    .GET()
                                    .build(),
                            HttpResponse.BodyHandlers.ofString());
            assertThat(publicPage.statusCode()).isEqualTo(200);
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("대체 제공자의 실제 HTTP 코드 교환·프로필 조회·콜백으로 소셜 가입·연결·재인증을 검증한다")
    void oauthCallbackFixture() throws Exception {
        UUID existing = member("member@example.test");
        when(registrations.findByRegistrationId("naver")).thenReturn(fixtureRegistration("naver"));
        try (var browser = browser()) {
            assertThat(
                            callback(browser, "kakao", "login")
                                    .headers()
                                    .firstValue("location")
                                    .orElseThrow())
                    .isEqualTo("/login#completed");
            UUID social =
                    UUID.fromString(
                            json.readTree(send(browser, "GET", "me", null, false).body())
                                    .path("id")
                                    .asText());
            assertThat(social).isNotEqualTo(existing);
            assertThat(service.methods(social)).hasSize(1);
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM spring_session WHERE principal_name=?",
                                    Integer.class,
                                    social.toString()))
                    .isEqualTo(1);
            assertThat(
                            callback(browser, "naver", "link")
                                    .headers()
                                    .firstValue("location")
                                    .orElseThrow())
                    .isEqualTo("/login#completed");
            assertThat(service.methods(social)).hasSize(2);
            assertThat(naverStateSent.get()).isTrue();
            assertThat(
                            callback(browser, "naver", "reauth")
                                    .headers()
                                    .firstValue("location")
                                    .orElseThrow())
                    .isEqualTo("/login#completed");
            providerSubject.set("wrong-account");
            assertThat(
                            callback(browser, "naver", "reauth")
                                    .headers()
                                    .firstValue("location")
                                    .orElseThrow())
                    .isEqualTo("/login#error");
            assertThat(service.methods(social)).hasSize(2);
        }
    }

    @Test
    @DisplayName("제공자 코드 교환 실패는 회원을 만들지 않고 원격 해제 실패는 로컬 수단을 보존한다")
    void oauthFailureAndRemoval() throws Exception {
        try (var browser = browser()) {
            providerFailure.set(true);
            assertThat(
                            callback(browser, "kakao", "login")
                                    .headers()
                                    .firstValue("location")
                                    .orElseThrow())
                    .isEqualTo("/login#error");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM app_user", Integer.class))
                    .isZero();
        }
        UUID existing = member("member@example.test");
        service.oauth("naver", "provider-id", "link", existing, 0, null, null);
        assertThatThrownBy(
                        () ->
                                service.removeOAuth(
                                        existing,
                                        "naver",
                                        false,
                                        () -> {
                                            throw new IllegalStateException("원격 연결 해제 실패");
                                        }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(service.methods(existing)).hasSize(2);
        service.removeOAuth(existing, "naver", false, () -> {});
        assertThat(service.methods(existing)).hasSize(1);
    }

    @Test
    @DisplayName("로컬 가입·로그인·메일 인증·복구·연결 API는 로그인 전후 모두 차단한다")
    void removedLocalEndpoints() throws Exception {
        try (var browser = browser()) {
            for (boolean authenticated : new boolean[] {false, true}) {
                if (authenticated) login(browser, "existing-member");
                for (String path :
                        java.util.List.of(
                                "register",
                                "login",
                                "email/resend",
                                "password/reset-request",
                                "token/consume",
                                "reauthenticate",
                                "password/change",
                                "local/link",
                                "methods/local/unlink"))
                    assertThat(send(browser, "POST", path, Map.of(), true).statusCode())
                            .isEqualTo(authenticated ? 403 : 401);
            }
            assertThat(jdbc.queryForObject("SELECT count(*) FROM local_credential", Integer.class))
                    .isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_token", Integer.class))
                    .isZero();
        }
    }

    @Test
    @DisplayName("구글 OIDC는 서명·발급자·대상·nonce를 검증하고 서버 회원 세션만 저장한다")
    void googleCallback() throws Exception {
        when(registrations.findByRegistrationId("google"))
                .thenReturn(fixtureRegistration("google"));
        try (var browser = browser()) {
            assertThat(
                            callback(browser, "google", "login")
                                    .headers()
                                    .firstValue("location")
                                    .orElseThrow())
                    .isEqualTo("/login#completed");
            var current = json.readTree(send(browser, "GET", "me", null, false).body());
            assertThat(current.path("methods").get(0).path("provider").asText())
                    .isEqualTo("google");
            assertThat(current.toString()).doesNotContain("fixture-access", "email", "subject");
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM spring_session_attributes WHERE attribute_name LIKE '%AUTHORIZED_CLIENT%' OR encode(attribute_bytes, 'escape') LIKE '%fixture-access%' OR encode(attribute_bytes, 'escape') LIKE '%eyJ%'",
                                    Integer.class))
                    .isZero();
        }
        for (String invalid :
                java.util.List.of("issuer", "audience", "nonce", "signature", "expiry")) {
            googleInvalidClaim.set(invalid);
            try (var browser = browser()) {
                assertThat(
                                callback(browser, "google", "login")
                                        .headers()
                                        .firstValue("location")
                                        .orElseThrow())
                        .isEqualTo("/login#error");
                assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
            }
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_user", Integer.class))
                .isEqualTo(1);
    }

    @Test
    @DisplayName("소셜 신규 가입은 현재 동의를 요구하지만 기존 회원 로그인은 동의를 재요구하지 않는다")
    void socialConsent() {
        assertThatThrownBy(() -> service.oauth("google", "new", "login", null, -1, "", ""))
                .isInstanceOf(AuthFailure.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_user", Integer.class)).isZero();
        var member = service.oauth("google", "new", "login", null, -1, "test-v1", "test-v1");
        assertThat(service.oauth("google", "new", "login", null, -1, "", "").id())
                .isEqualTo(member.id());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_consent", Integer.class))
                .isEqualTo(2);
    }

    @Test
    @DisplayName("만료된 소셜 시작과 이미 사용한 콜백은 회원 세션을 만들지 않는다")
    void expiredStartAndReplay() throws Exception {
        try (var browser = browser()) {
            send(
                    browser,
                    "POST",
                    "oauth/kakao/start",
                    Map.of("mode", "login", "termsVersion", "test-v1", "privacyVersion", "test-v1"),
                    true);
            String location =
                    send(browser, "GET", "oauth2/authorization/kakao", null, false)
                            .headers()
                            .firstValue("location")
                            .orElseThrow();
            byte[] stale =
                    org.springframework.util.SerializationUtils.serialize(
                            Instant.now().minusSeconds(301).getEpochSecond());
            jdbc.update(
                    "UPDATE spring_session_attributes SET attribute_bytes=? WHERE attribute_name='OAUTH_CREATED'",
                    stale);
            var expired =
                    send(
                            browser,
                            "GET",
                            "login/oauth2/code/kakao?code=fixture-code&state="
                                    + java.net.URLEncoder.encode(
                                            query(location, "state"),
                                            java.nio.charset.StandardCharsets.UTF_8),
                            null,
                            false);
            assertThat(expired.headers().firstValue("location").orElseThrow())
                    .isEqualTo("/login#error");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM app_user", Integer.class))
                    .isZero();
            var completed = callback(browser, "kakao", "login");
            assertThat(completed.headers().firstValue("location").orElseThrow())
                    .isEqualTo("/login#completed");
            var replay =
                    browser.send(
                            HttpRequest.newBuilder(completed.request().uri()).GET().build(),
                            HttpResponse.BodyHandlers.ofString());
            assertThat(replay.headers().firstValue("location").orElseThrow())
                    .isEqualTo("/login#error");
            assertThat(send(browser, "GET", "me", null, false).statusCode()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("HTTP 소셜 시작도 접속 주소 한도를 적용하고 정책 미설정은 신규 가입을 차단한다")
    void startLimitAndMissingPolicy() throws Exception {
        for (int i = 0; i < 50; i++) limiter.check("oauth-start:127.0.0.1", 50, 900);
        try (var browser = browser()) {
            assertThat(
                            send(
                                            browser,
                                            "POST",
                                            "oauth/kakao/start",
                                            Map.of("mode", "login"),
                                            true)
                                    .statusCode())
                    .isEqualTo(429);
        }
        var unconfigured = new AuthService(jdbc, "", "");
        assertThatThrownBy(() -> unconfigured.agreements("", "")).isInstanceOf(AuthFailure.class);
    }

    private String googleToken() {
        try {
            Instant now = Instant.now();
            var claims =
                    new com.nimbusds.jwt.JWTClaimsSet.Builder()
                            .issuer(
                                    googleInvalidClaim.get().equals("issuer")
                                            ? "https://wrong.test"
                                            : "https://accounts.google.com")
                            .audience(
                                    googleInvalidClaim.get().equals("audience")
                                            ? "wrong-client"
                                            : "fixture-client")
                            .subject(providerSubject.get())
                            .issueTime(java.util.Date.from(now.minusSeconds(600)))
                            .expirationTime(
                                    java.util.Date.from(
                                            googleInvalidClaim.get().equals("expiry")
                                                    ? now.minusSeconds(120)
                                                    : now.plusSeconds(300)))
                            .claim(
                                    "nonce",
                                    googleInvalidClaim.get().equals("nonce")
                                            ? "wrong-nonce"
                                            : googleNonce.get())
                            .build();
            var jwt =
                    new com.nimbusds.jwt.SignedJWT(
                            new com.nimbusds.jose.JWSHeader.Builder(
                                            com.nimbusds.jose.JWSAlgorithm.RS256)
                                    .keyID("fixture-key")
                                    .build(),
                            claims);
            var key =
                    googleInvalidClaim.get().equals("signature")
                            ? new com.nimbusds.jose.jwk.gen.RSAKeyGenerator(2048).generate()
                            : googleKey;
            jwt.sign(new com.nimbusds.jose.crypto.RSASSASigner(key));
            return json.writeValueAsString(
                    Map.of(
                            "access_token",
                            "fixture-access",
                            "token_type",
                            "Bearer",
                            "expires_in",
                            3600,
                            "id_token",
                            jwt.serialize()));
        } catch (Exception failure) {
            throw new IllegalStateException("구글 대체 토큰 생성 실패", failure);
        }
    }

    private String query(String location, String name) {
        return java.net.URLDecoder.decode(
                java.util.Arrays.stream(URI.create(location).getRawQuery().split("&"))
                        .filter(pair -> pair.startsWith(name + "="))
                        .findFirst()
                        .orElseThrow()
                        .substring(name.length() + 1),
                java.nio.charset.StandardCharsets.UTF_8);
    }

    private org.springframework.security.oauth2.client.registration.ClientRegistration
            fixtureRegistration(String provider) {
        var builder =
                org.springframework.security.oauth2.client.registration.ClientRegistration
                        .withRegistrationId(provider)
                        .clientId("fixture-client")
                        .clientSecret("fixture-secret")
                        .clientAuthenticationMethod(
                                org.springframework.security.oauth2.core.ClientAuthenticationMethod
                                        .CLIENT_SECRET_POST)
                        .authorizationGrantType(
                                org.springframework.security.oauth2.core.AuthorizationGrantType
                                        .AUTHORIZATION_CODE)
                        .authorizationUri(
                                provider.equals("google")
                                        ? "https://accounts.google.com/o/oauth2/v2/auth"
                                        : provider.equals("kakao")
                                                ? "https://kauth.kakao.com/oauth/authorize"
                                                : "https://nid.naver.com/oauth2.0/authorize")
                        .tokenUri(
                                "http://127.0.0.1:"
                                        + providerServer.getAddress().getPort()
                                        + "/"
                                        + provider
                                        + "/token")
                        .userInfoUri(
                                "http://127.0.0.1:"
                                        + providerServer.getAddress().getPort()
                                        + "/"
                                        + provider
                                        + "/me")
                        .userNameAttributeName(
                                provider.equals("google")
                                        ? "sub"
                                        : provider.equals("kakao") ? "id" : "response")
                        .redirectUri(
                                "http://localhost:3000/api/auth/login/oauth2/code/" + provider);
        if (provider.equals("google"))
            builder.scope("openid")
                    .issuerUri("https://accounts.google.com")
                    .jwkSetUri(
                            "http://127.0.0.1:"
                                    + providerServer.getAddress().getPort()
                                    + "/google/jwks");
        return builder.build();
    }

    private HttpResponse<String> callback(HttpClient browser, String provider, String mode)
            throws Exception {
        assertThat(
                        send(
                                        browser,
                                        "POST",
                                        "oauth/" + provider + "/start",
                                        Map.of(
                                                "mode",
                                                mode,
                                                "termsVersion",
                                                "test-v1",
                                                "privacyVersion",
                                                "test-v1"),
                                        true)
                                .statusCode())
                .isEqualTo(200);
        String location =
                send(browser, "GET", "oauth2/authorization/" + provider, null, false)
                        .headers()
                        .firstValue("location")
                        .orElseThrow();
        if (provider.equals("google")) googleNonce.set(query(location, "nonce"));
        String state =
                java.util.Arrays.stream(URI.create(location).getRawQuery().split("&"))
                        .filter(pair -> pair.startsWith("state="))
                        .findFirst()
                        .orElseThrow()
                        .substring(6);
        return browser.send(
                HttpRequest.newBuilder(
                                URI.create(
                                        base()
                                                + "login/oauth2/code/"
                                                + provider
                                                + "?code=fixture-code&state="
                                                + state))
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private boolean attempt(Runnable action) {
        try {
            action.run();
            return true;
        } catch (AuthFailure failure) {
            return false;
        }
    }

    private UUID member(String subject) {
        return service.oauth("kakao", subject, "login", null, -1, "test-v1", "test-v1").id();
    }

    private HttpClient browser() {
        return HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
    }

    private String base() {
        return "http://127.0.0.1:" + port + "/api/auth/";
    }

    private String cookie(HttpClient browser) {
        return ((CookieManager) browser.cookieHandler().orElseThrow())
                .getCookieStore()
                .getCookies()
                .getFirst()
                .getValue();
    }

    private void login(HttpClient browser, String subject) throws Exception {
        providerSubject.set(subject);
        assertThat(
                        callback(browser, "kakao", "login")
                                .headers()
                                .firstValue("location")
                                .orElseThrow())
                .isEqualTo("/login#completed");
    }

    private HttpResponse<String> send(
            HttpClient browser, String method, String path, Object body, boolean csrf)
            throws Exception {
        String token = null;
        if (csrf)
            token =
                    json.readTree(send(browser, "GET", "csrf", null, false).body())
                            .path("token")
                            .asText();
        var builder = HttpRequest.newBuilder(URI.create(base() + path));
        if (token != null) builder.header("X-CSRF-TOKEN", token);
        if (body != null) builder.header("Content-Type", "application/json");
        builder.method(
                method,
                body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return browser.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
