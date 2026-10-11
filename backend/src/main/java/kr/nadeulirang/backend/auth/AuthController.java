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
    record Register(String email, String password, String nickname, String termsVersion, String privacyVersion) { }
    record Login(String email, String password) { }
    record Email(String email) { }
    record Token(String token, String purpose, String password) { }
    record Password(String currentPassword, String password) { }
    record Local(String email, String password) { }
    record OAuthStart(String mode, String termsVersion, String privacyVersion) { }
    record Admin(String role, String status) { }
    private final AuthService service;
    private final AuthSessions sessions;
    private final ClientRegistrationRepository registrations;
    AuthController(AuthService service, AuthSessions sessions, ClientRegistrationRepository registrations) {
        this.service = service; this.sessions = sessions; this.registrations = registrations;
    }
    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store"); return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
    @GetMapping("/options")
    Map<String, Object> options() {
        return Map.of("termsVersion", service.termsVersion(), "privacyVersion", service.privacyVersion(),
                "providers", List.of("kakao", "naver").stream().filter(p -> registrations.findByRegistrationId(p) != null).toList());
    }
    @PostMapping("/register")
    Map<String, Boolean> register(@RequestBody Register body) {
        service.register(body.email(), body.password(), body.nickname(), body.termsVersion(), body.privacyVersion()); return Map.of("accepted", true);
    }
    @PostMapping("/login")
    Map<String, Boolean> login(@RequestBody Login body, HttpServletRequest request, HttpServletResponse response) {
        var member = service.login(body.email(), body.password(), request.getRemoteAddr());
        sessions.login(member, request, response); return Map.of("authenticated", true);
    }
    @GetMapping("/me")
    Map<String, Object> me(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        var member = service.member(sessions.user());
        return Map.of("id", member.id(), "nickname", member.nickname(), "role", member.role(), "status", member.status(), "methods", service.methods(member.id()));
    }
    @PostMapping("/email/resend")
    Map<String, Boolean> resend(@RequestBody Email body) { service.requestMail(body.email(), "EMAIL_VERIFY"); return Map.of("accepted", true); }
    @PostMapping("/password/reset-request")
    Map<String, Boolean> reset(@RequestBody Email body) { service.requestMail(body.email(), "PASSWORD_RESET"); return Map.of("accepted", true); }
    @PostMapping("/token/consume")
    Map<String, Boolean> consume(@RequestBody Token body, HttpServletRequest request) {
        UUID user = null;
        if ("LOCAL_LINK".equals(body.purpose())) { sessions.recent(request); user = sessions.user(); }
        service.consume(body.token(), body.purpose(), body.password(), user); return Map.of("completed", true);
    }
    @PostMapping("/reauthenticate")
    Map<String, Boolean> reauthenticate(@RequestBody Login body, HttpServletRequest request) {
        service.reauthenticate(sessions.user(), body.password());
        request.getSession().setAttribute(AuthSessions.REAUTH, Instant.now().getEpochSecond()); return Map.of("authenticated", true);
    }
    @PostMapping("/password/change")
    Map<String, Boolean> change(@RequestBody Password body, HttpServletRequest request) {
        service.changePassword(sessions.user(), body.currentPassword(), body.password()); sessions.logout(request); return Map.of("completed", true);
    }
    @PostMapping("/local/link")
    Map<String, Boolean> link(@RequestBody Local body, HttpServletRequest request) {
        sessions.recent(request); service.linkLocal(sessions.user(), body.email(), body.password()); return Map.of("accepted", true);
    }
    @PostMapping("/methods/{provider}/unlink")
    Map<String, Boolean> unlink(@PathVariable String provider, HttpServletRequest request) {
        sessions.recent(request);
        if (!provider.equals("local")) throw new AuthFailure(400, "OAUTH_REQUIRED", "소셜 인증으로 연결을 해제하세요.");
        service.unlink(sessions.user(), provider); sessions.logout(request); return Map.of("completed", true);
    }
    @PostMapping("/logout")
    Map<String, Boolean> logout(HttpServletRequest request) { sessions.logout(request); return Map.of("completed", true); }
    @PostMapping("/sessions/end-all")
    Map<String, Boolean> endAll(HttpServletRequest request) { service.revoke(sessions.user()); sessions.logout(request); return Map.of("completed", true); }
    @DeleteMapping("/me")
    Map<String, Boolean> withdraw(HttpServletRequest request) {
        sessions.recent(request); service.prepareRemoval(sessions.user(), null, true);
        service.withdraw(sessions.user()); sessions.logout(request); return Map.of("completed", true);
    }
    @PatchMapping("/admin/users/{id}")
    Map<String, Boolean> administer(@PathVariable UUID id, @RequestBody Admin body, HttpServletRequest request) {
        sessions.recent(request); service.administer(sessions.user(), id, body.role(), body.status()); return Map.of("completed", true);
    }
    @PostMapping("/oauth/{provider}/start")
    Map<String, String> oauth(@PathVariable String provider, @RequestBody OAuthStart body, HttpServletRequest request) {
        if (registrations.findByRegistrationId(provider) == null) throw new AuthFailure(503, "PROVIDER_UNAVAILABLE", "소셜 로그인 설정을 준비 중입니다.");
        if (body.mode() == null || !List.of("login", "link", "reauth", "unlink", "withdraw").contains(body.mode())) throw AuthFailure.invalid();
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
