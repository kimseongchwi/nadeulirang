package kr.nadeulirang.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.stereotype.Component;

@Component
class AuthSessions {
    static final String VERSION = "MEMBER_VERSION";
    static final String CREATED = "MEMBER_LOGIN_AT";
    static final String REAUTH = "MEMBER_REAUTH_AT";
    final HttpSessionSecurityContextRepository contexts = new HttpSessionSecurityContextRepository();
    final HttpSessionCsrfTokenRepository csrf = new HttpSessionCsrfTokenRepository();

    void login(AuthService.Member member, HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) request.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication(member));
        SecurityContextHolder.setContext(context);
        HttpSession session = request.getSession(true);
        session.setAttribute(VERSION, member.version());
        session.setAttribute(CREATED, Instant.now().getEpochSecond());
        session.setAttribute(REAUTH, Instant.now().getEpochSecond());
        csrf.saveToken(null, request, response);
        contexts.saveContext(context, request, response);
    }
    static UsernamePasswordAuthenticationToken authentication(AuthService.Member member) {
        return UsernamePasswordAuthenticationToken.authenticated(member.id().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_" + member.role())));
    }
    UUID user() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) throw AuthFailure.denied();
        try { return UUID.fromString(auth.getName()); }
        catch (IllegalArgumentException failure) { throw AuthFailure.denied(); }
    }
    void recent(HttpServletRequest request) {
        user(); HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute(REAUTH) instanceof Long timestamp)
                || timestamp < Instant.now().minusSeconds(300).getEpochSecond())
            throw new AuthFailure(403, "REAUTHENTICATION_REQUIRED", "다시 인증한 뒤 진행하세요.");
    }
    void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
    }
}
