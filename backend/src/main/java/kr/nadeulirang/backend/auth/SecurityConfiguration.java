package kr.nadeulirang.backend.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.beans.factory.annotation.Value;

@Configuration
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
class SecurityConfiguration {
    @Bean org.springframework.security.core.userdetails.UserDetailsService noDefaultUser() {
        return username -> { throw new org.springframework.security.core.userdetails.UsernameNotFoundException("자체 인증 API를 사용하세요."); };
    }
    @Bean DefaultCookieSerializer sessionCookie(@Value("${auth.secure-cookie:false}") boolean secure,
                                               @Value("${auth.public-origin:http://localhost:3000}") String origin) {
        var uri = java.net.URI.create(origin);
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || !(uri.getPath().isEmpty()) || !(uri.getScheme().equals("https")
                || (uri.getScheme().equals("http") && ListHolder.LOCAL_HOSTS.contains(uri.getHost()))))
            throw new IllegalArgumentException("AUTH_PUBLIC_ORIGIN은 HTTPS 원점 또는 로컬 HTTP 원점이어야 합니다.");
        var serializer = new DefaultCookieSerializer();
        serializer.setCookieName("NADEULIRANG_SESSION"); serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true); serializer.setUseSecureCookie(secure || uri.getScheme().equals("https")); serializer.setSameSite("Lax");
        return serializer;
    }
    @Bean
    SecurityFilterChain security(HttpSecurity http, AuthService service, AuthSessions sessions,
                                 OAuth2AuthorizationRequestResolver resolver, OAuth2AuthorizedClientRepository clients) throws Exception {
        var users = new DefaultOAuth2UserService();
        var factory = new org.springframework.http.client.JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build());
        factory.setReadTimeout(java.time.Duration.ofSeconds(10));
        users.setRestOperations(new org.springframework.web.client.RestTemplate(factory));
        var tokens = new org.springframework.security.oauth2.client.endpoint.RestClientAuthorizationCodeTokenResponseClient();
        tokens.setRestClient(org.springframework.web.client.RestClient.builder().requestFactory(factory)
            .messageConverters(converters -> {
                converters.clear(); converters.add(new org.springframework.http.converter.FormHttpMessageConverter());
                converters.add(new org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter());
            }).defaultStatusHandler(new org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler()).build());
        tokens.addParametersConverter(grant -> {
            var parameters = new org.springframework.util.LinkedMultiValueMap<String, String>();
            if (grant.getClientRegistration().getRegistrationId().equals("naver"))
                parameters.add("state", grant.getAuthorizationExchange().getAuthorizationRequest().getState());
            return parameters;
        });
        http.securityContext(context -> context.securityContextRepository(sessions.contexts))
            .requestCache(cache -> cache.disable())
            .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable()).logout(logout -> logout.disable())
            .csrf(csrf -> csrf.csrfTokenRepository(sessions.csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/csrf", "/api/auth/options", "/api/auth/register", "/api/auth/login", "/api/auth/email/resend", "/api/auth/password/reset-request", "/api/auth/token/consume", "/api/auth/oauth/*/start", "/api/auth/oauth2/**", "/api/auth/login/oauth2/**", "/api/auth/logout").permitAll()
                .requestMatchers("/api/auth/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/auth/**").authenticated()
                .anyRequest().permitAll())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((req, res, failure) -> AuthErrorHandler.write(res, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다."))
                .accessDeniedHandler((req, res, failure) -> AuthErrorHandler.write(res, 403, "FORBIDDEN", "요청 인증 또는 권한을 확인하세요.")))
            .oauth2Login(oauth -> oauth
                .authorizedClientRepository(clients)
                .tokenEndpoint(endpoint -> endpoint.accessTokenResponseClient(tokens))
                .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(resolver))
                .redirectionEndpoint(endpoint -> endpoint.baseUri("/api/auth/login/oauth2/code/*"))
                .userInfoEndpoint(endpoint -> endpoint.userService(request -> OAuthConfiguration.identity(request.getClientRegistration().getRegistrationId(), users.loadUser(request).getAttributes())))
                .successHandler((req, res, auth) -> OAuthConfiguration.complete(service, sessions, req, res, auth))
                .failureHandler((req, res, failure) -> { sessions.logout(req); OAuthConfiguration.redirect(res, "/account#error"); }))
            .addFilterBefore(new MemberSessionFilter(service, sessions), AuthorizationFilter.class);
        return http.build();
    }
    private static class ListHolder { static final java.util.List<String> LOCAL_HOSTS = java.util.List.of("localhost", "127.0.0.1"); }
}
