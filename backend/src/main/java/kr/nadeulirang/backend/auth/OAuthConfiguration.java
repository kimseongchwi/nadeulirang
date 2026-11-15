package kr.nadeulirang.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.client.RestClient;

@Configuration
class OAuthConfiguration {
    static final String KAKAO = "kakao";
    private static final String AUTHORIZATION_BASE = "/api/auth/oauth2/authorization";
    static final String AUTHORIZATION_PATH = AUTHORIZATION_BASE + "/" + KAKAO;
    static final String CALLBACK_PATH = "/api/auth/login/oauth2/code/" + KAKAO;

    @Bean
    ClientRegistrationRepository registrations(Environment env) {
        String id = env.getProperty("auth.oauth.kakao.client-id", "");
        String secret = env.getProperty("auth.oauth.kakao.client-secret", "");
        if (id.isBlank() || secret.isBlank()) return provider -> null;
        var registration =
                ClientRegistration.withRegistrationId(KAKAO)
                        .clientId(id)
                        .clientSecret(secret)
                        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                        .redirectUri(
                                env.getProperty("auth.public-origin", "http://localhost:3000")
                                        + CALLBACK_PATH)
                        .authorizationUri("https://kauth.kakao.com/oauth/authorize")
                        .tokenUri("https://kauth.kakao.com/oauth/token")
                        .userInfoUri("https://kapi.kakao.com/v2/user/me")
                        .userNameAttributeName("id")
                        .clientName(KAKAO)
                        .build();
        return provider -> KAKAO.equals(provider) ? registration : null;
    }

    @Bean
    OAuth2AuthorizationRequestResolver authorizationResolver(
            ClientRegistrationRepository registrations) {
        var delegate =
                new DefaultOAuth2AuthorizationRequestResolver(registrations, AUTHORIZATION_BASE);
        var kakaoPath = PathPatternRequestMatcher.withDefaults().matcher(AUTHORIZATION_PATH);
        return new OAuth2AuthorizationRequestResolver() {
            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
                if (!kakaoPath.matches(request)
                        || registrations.findByRegistrationId(KAKAO) == null) return null;
                return checked(request, delegate.resolve(request));
            }

            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String id) {
                if (!KAKAO.equals(id) || registrations.findByRegistrationId(KAKAO) == null)
                    return null;
                return checked(request, delegate.resolve(request, id));
            }

            private OAuth2AuthorizationRequest checked(
                    HttpServletRequest request, OAuth2AuthorizationRequest authorization) {
                if (authorization == null) return null;
                var session = request.getSession(false);
                String provider = authorization.getAttribute("registration_id");
                if (session == null
                        || !provider.equals(session.getAttribute("OAUTH_PROVIDER"))
                        || !(session.getAttribute("OAUTH_CREATED") instanceof Long created)
                        || created < Instant.now().minusSeconds(300).getEpochSecond())
                    throw new OAuth2AuthenticationException(new OAuth2Error("invalid_request"));
                return OAuth2AuthorizationRequest.from(authorization)
                        .additionalParameters(parameters -> parameters.put("prompt", "login"))
                        .build();
            }
        };
    }

    @Bean
    OAuth2AuthorizedClientRepository authorizedClients() {
        // 제공자 토큰은 콜백 요청 안에서만 사용하고 세션/DB에 보관하지 않는다.
        return new OAuth2AuthorizedClientRepository() {
            @Override
            public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(
                    String id, Authentication auth, HttpServletRequest request) {
                return null;
            }

            @Override
            public void saveAuthorizedClient(
                    OAuth2AuthorizedClient client,
                    Authentication auth,
                    HttpServletRequest request,
                    HttpServletResponse response) {
                request.setAttribute("OAUTH_CLIENT", client);
            }

            @Override
            public void removeAuthorizedClient(
                    String id,
                    Authentication auth,
                    HttpServletRequest request,
                    HttpServletResponse response) {}
        };
    }

    static OAuth2User identity(Map<String, Object> attributes) {
        Object subject = attributes.get("id");
        if (subject == null || subject.toString().isBlank() || subject.toString().length() > 255)
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_user_info"));
        // 이메일·프로필 원문을 인증 주체와 세션에 남기지 않는다.
        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", subject.toString(), "provider", KAKAO),
                "sub");
    }

    static void complete(
            AuthService service,
            AuthSessions sessions,
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication)
            throws java.io.IOException {
        try {
            var session = request.getSession(false);
            if (session == null
                    || !(session.getAttribute("OAUTH_CREATED") instanceof Long created)
                    || created < Instant.now().minusSeconds(300).getEpochSecond())
                throw AuthFailure.denied();
            OAuth2User identity = (OAuth2User) authentication.getPrincipal();
            String provider =
                    ((org.springframework.security.oauth2.client.authentication
                                            .OAuth2AuthenticationToken)
                                    authentication)
                            .getAuthorizedClientRegistrationId();
            if (!provider.equals(session.getAttribute("OAUTH_PROVIDER")))
                throw AuthFailure.denied();
            String mode = (String) session.getAttribute("OAUTH_MODE");
            String target = (String) session.getAttribute("OAUTH_TARGET");
            long version = session.getAttribute("OAUTH_VERSION") instanceof Long value ? value : -1;
            boolean removal = "unlink".equals(mode) || "withdraw".equals(mode);
            var member =
                    service.oauth(
                            provider,
                            identity.getName(),
                            removal ? "reauth" : mode,
                            target == null ? null : UUID.fromString(target),
                            version,
                            (String) session.getAttribute("OAUTH_TERMS"),
                            (String) session.getAttribute("OAUTH_PRIVACY"));
            if (removal) {
                OAuth2AuthorizedClient client =
                        (OAuth2AuthorizedClient) request.getAttribute("OAUTH_CLIENT");
                service.removeOAuth(
                        member.id(),
                        provider,
                        mode.equals("withdraw"),
                        () -> revokeProvider(client));
                sessions.logout(request);
            } else {
                for (String key :
                        List.of(
                                "OAUTH_MODE",
                                "OAUTH_PROVIDER",
                                "OAUTH_CREATED",
                                "OAUTH_TARGET",
                                "OAUTH_VERSION",
                                "OAUTH_TERMS",
                                "OAUTH_PRIVACY")) session.removeAttribute(key);
                sessions.login(member, request, response);
            }
            redirect(response, "/login#completed");
        } catch (RuntimeException failure) {
            sessions.logout(request);
            redirect(response, "/login#error");
        }
    }

    static void redirect(HttpServletResponse response, String location) {
        response.setStatus(302);
        response.setHeader("Location", location);
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");
    }

    private static void revokeProvider(OAuth2AuthorizedClient client) {
        if (client == null) throw AuthFailure.denied();
        var factory =
                new org.springframework.http.client.JdkClientHttpRequestFactory(
                        java.net.http.HttpClient.newBuilder()
                                .connectTimeout(java.time.Duration.ofSeconds(5))
                                .build());
        factory.setReadTimeout(java.time.Duration.ofSeconds(10));
        var rest = RestClient.builder().requestFactory(factory).build();
        rest.post()
                .uri("https://kapi.kakao.com/v1/user/unlink")
                .header("Authorization", "Bearer " + client.getAccessToken().getTokenValue())
                .retrieve()
                .toBodilessEntity();
    }
}
