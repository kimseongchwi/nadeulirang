package kr.nadeulirang.backend.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
class AuthCoreConfiguration {
    @Bean PasswordEncoder passwords() { return new BCryptPasswordEncoder(12); }
}
