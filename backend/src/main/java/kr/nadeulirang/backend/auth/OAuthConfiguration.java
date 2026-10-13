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
import org.springframework.web.client.RestClient;

@Configuration
class OAuthConfiguration {
    @Bean
    ClientRegistrationRepository registrations(Environment env) {
        var registrations = new java.util.HashMap<String, ClientRegistration>();
        for (String provider : List.of("kakao", "naver", "google")) {
            String id = env.getProperty("auth.oauth." + provider + ".client-id", "");
            String secret = env.getProperty("auth.oauth." + provider + ".client-secret", "");
            if (id.isBlank() || secret.isBlank()) continue;
            if (provider.equals("google")) {
                registrations.put(
                        provider,
                        ClientRegistration.withRegistrationId(provider)
                                .clientId(id)
                                .clientSecret(secret)
                                .clientAuthenticationMethod(
                                        ClientAuthenticationMethod.CLIENT_SECRET_POST)
                                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                                .scope("openid")
                                .redirectUri(
                                        env.getProperty(
                                                        "auth.public-origin",
                                                        "http://localhost:3000")
                                                + "/api/auth/login/oauth2/code/google")
                                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                                .tokenUri("https://oauth2.googleapis.com/token")
                                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                                .issuerUri("https://accounts.google.com")
                                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                                .userNameAttributeName("sub")
                                .clientName(provider)
                                .build());
                continue;
            }
            boolean kakao = provider.equals("kakao");
            registrations.put(
                    provider,
                    ClientRegistration.withRegistrationId(provider)
                            .clientId(id)
                            .clientSecret(secret)
                            .clientAuthenticationMethod(
                                    ClientAuthenticationMethod.CLIENT_SECRET_POST)
                            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                            .redirectUri(
                                    env.getProperty("auth.public-origin", "http://localhost:3000")
                                            + "/api/auth/login/oauth2/code/"
                                            + provider)
                            .authorizationUri(
                                    kakao
                                            ? "https://kauth.kakao.com/oauth/authorize"
                                            : "https://nid.naver.com/oauth2.0/authorize")
                            .tokenUri(
                                    kakao
                                            ? "https://kauth.kakao.com/oauth/token"
                                            : "https://nid.naver.com/oauth2.0/token")
                            .userInfoUri(
                                    kakao
                                            ? "https://kapi.kakao.com/v2/user/me"
                                            : "https://openapi.naver.com/v1/nid/me")
                            .userNameAttributeName(kakao ? "id" : "response")
                            .clientName(provider)
                            .build());
        }
        return registrations::get;
    }

    @Bean
    OAuth2AuthorizationRequestResolver authorizationResolver(
            ClientRegistrationRepository registrations) {
        var delegate =
                new DefaultOAuth2AuthorizationRequestResolver(
                        registrations, "/api/auth/oauth2/authorization");
        return new OAuth2AuthorizationRequestResolver() {
            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
                return checked(request, delegate.resolve(request));
            }

            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String id) {
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
                        .additionalParameters(
                                parameters -> {
                                    // 새 수단 인증과 소셜 재인증에서 제공자의 기존 자동 로그인만으로 끝나지 않게 한다.
                                    if (provider.equals("kakao")) parameters.put("prompt", "login");
                                    else if (provider.equals("naver"))
                                        parameters.put("auth_type", "reauthenticate");
                                    else parameters.put("prompt", "select_account");
                                })
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

    static OAuth2User identity(String provider, Map<String, Object> attributes) {
        Object subject;
        if (provider.equals("naver")) {
            if (!"00".equals(attributes.get("resultcode"))
                    || !(attributes.get("response") instanceof Map<?, ?> profile))
                throw new OAuth2AuthenticationException(new OAuth2Error("invalid_user_info"));
            subject = profile.get("id");
        } else subject = attributes.get("id");
        if (subject == null || subject.toString().isBlank() || subject.toString().length() > 255)
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_user_info"));
        // 이메일·프로필 원문을 인증 주체와 세션에 남기지 않는다.
        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", subject.toString(), "provider", provider),
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
        String provider = client.getClientRegistration().getRegistrationId();
        var factory =
                new org.springframework.http.client.JdkClientHttpRequestFactory(
                        java.net.http.HttpClient.newBuilder()
                                .connectTimeout(java.time.Duration.ofSeconds(5))
                                .build());
        factory.setReadTimeout(java.time.Duration.ofSeconds(10));
        var rest = RestClient.builder().requestFactory(factory).build();
        if (provider.equals("kakao")) {
            rest.post()
                    .uri("https://kapi.kakao.com/v1/user/unlink")
                    .header("Authorization", "Bearer " + client.getAccessToken().getTokenValue())
                    .retrieve()
                    .toBodilessEntity();
        } else if (provider.equals("google")) {
            var form = new org.springframework.util.LinkedMultiValueMap<String, String>();
            form.add("token", client.getAccessToken().getTokenValue());
            rest.post()
                    .uri("https://oauth2.googleapis.com/revoke")
                    .contentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
        } else {
            var form = new org.springframework.util.LinkedMultiValueMap<String, String>();
            form.add("client_id", client.getClientRegistration().getClientId());
            form.add("client_secret", client.getClientRegistration().getClientSecret());
            form.add("token", client.getAccessToken().getTokenValue());
            form.add("token_type_hint", "access_token");
            // 현재 공식 명세는 revoke 성공 시 빈 본문 HTTP 200을 반환한다.
            rest.post()
                    .uri("https://nid.naver.com/oauth2.0/revoke")
                    .contentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
        }
    }
}
