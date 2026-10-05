package kr.nadeulirang.backend.outing;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OutingTimeConfiguration {
    @Bean
    public Clock outingClock() { return Clock.systemUTC(); }
}
