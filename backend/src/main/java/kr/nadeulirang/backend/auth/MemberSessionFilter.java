package kr.nadeulirang.backend.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

final class MemberSessionFilter extends OncePerRequestFilter {
    private final AuthService service;
    private final AuthSessions sessions;

    MemberSessionFilter(AuthService service, AuthSessions sessions) {
        this.service = service;
        this.sessions = sessions;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication
                        instanceof
                        org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            try {
                var member = service.member(UUID.fromString(authentication.getName()));
                var session = request.getSession(false);
                if (session == null
                        || !Long.valueOf(member.version())
                                .equals(session.getAttribute(AuthSessions.VERSION))
                        || !(session.getAttribute(AuthSessions.CREATED) instanceof Long timestamp)
                        || timestamp < Instant.now().minusSeconds(43200).getEpochSecond())
                    throw AuthFailure.denied();
                AuthService.active(member);
                SecurityContextHolder.getContext()
                        .setAuthentication(AuthSessions.authentication(member));
            } catch (AuthFailure | IllegalArgumentException failure) {
                sessions.logout(request);
                if (!request.getRequestURI().startsWith("/api/auth/")) {
                    chain.doFilter(request, response);
                    return;
                }
                AuthErrorHandler.write(
                        response, 401, "SESSION_EXPIRED", "로그인이 만료되었습니다. 다시 로그인하세요.");
                return;
            } catch (DataAccessException failure) {
                AuthErrorHandler.write(
                        response, 503, "AUTH_UNAVAILABLE", "인증을 확인하지 못했습니다. 다시 시도하세요.");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
