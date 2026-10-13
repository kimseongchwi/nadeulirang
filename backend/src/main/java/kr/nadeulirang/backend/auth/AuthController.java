package kr.nadeulirang.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
class AuthController {
    record OAuthStart(String mode, String termsVersion, String privacyVersion) { }
    record Admin(String role, String status) { }
    private final AuthService service;
    private final AuthSessions sessions;
    private final AuthRateLimiter limiter;
    private final ClientRegistrationRepository registrations;
    AuthController(AuthService service, AuthSessions sessions, ClientRegistrationRepository registrations, AuthRateLimiter limiter) {
        this.service = service; this.sessions = sessions; this.registrations = registrations; this.limiter = limiter;
    }
    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store"); return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
    @GetMapping("/options")
    Map<String, Object> options() {
        return Map.of("termsVersion", service.termsVersion(), "privacyVersion", service.privacyVersion(),
                "providers", List.of("kakao", "naver", "google").stream().filter(p -> registrations.findByRegistrationId(p) != null).toList());
    }
    @GetMapping("/me")
    Map<String, Object> me(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        var member = service.member(sessions.user());
        return Map.of("id", member.id(), "nickname", member.nickname(), "role", member.role(), "status", member.status(), "methods", service.methods(member.id()));
    }
    @PostMapping("/logout")
    Map<String, Boolean> logout(HttpServletRequest request) { sessions.logout(request); return Map.of("completed", true); }
    @PostMapping("/sessions/end-all")
    Map<String, Boolean> endAll(HttpServletRequest request) { service.revoke(sessions.user()); sessions.logout(request); return Map.of("completed", true); }
    @PatchMapping("/admin/users/{id}")
    Map<String, Boolean> administer(@PathVariable UUID id, @RequestBody Admin body, HttpServletRequest request) {
        sessions.recent(request); service.administer(sessions.user(), id, body.role(), body.status()); return Map.of("completed", true);
    }
    @PostMapping("/oauth/{provider}/start")
    Map<String, String> oauth(@PathVariable String provider, @RequestBody OAuthStart body, HttpServletRequest request) {
        if (!List.of("kakao", "naver", "google").contains(provider)) throw AuthFailure.invalid();
        if (registrations.findByRegistrationId(provider) == null) throw new AuthFailure(503, "PROVIDER_UNAVAILABLE", "소셜 로그인 설정을 준비 중입니다.");
        if (body.mode() == null || !List.of("login", "link", "reauth", "unlink", "withdraw").contains(body.mode())) throw AuthFailure.invalid();
        limiter.check("oauth-start:" + request.getRemoteAddr(), 50, 900);
        var session = request.getSession(true);
        session.removeAttribute("OAUTH_TARGET"); session.removeAttribute("OAUTH_VERSION");
        if (!body.mode().equals("login")) {
            if (!body.mode().equals("reauth")) sessions.recent(request);
            var member = service.member(sessions.user());
            session.setAttribute("OAUTH_TARGET", member.id().toString()); session.setAttribute("OAUTH_VERSION", member.version());
        }
        session.setAttribute("OAUTH_MODE", body.mode()); session.setAttribute("OAUTH_PROVIDER", provider);
        session.setAttribute("OAUTH_CREATED", Instant.now().getEpochSecond());
        session.setAttribute("OAUTH_TERMS", body.termsVersion() == null ? "" : body.termsVersion());
        session.setAttribute("OAUTH_PRIVACY", body.privacyVersion() == null ? "" : body.privacyVersion());
        return Map.of("redirect", "/api/auth/oauth2/authorization/" + provider);
    }
}
