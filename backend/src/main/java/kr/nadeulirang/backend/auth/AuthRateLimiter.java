package kr.nadeulirang.backend.auth;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
class AuthRateLimiter {
    private final JdbcTemplate jdbc;

    AuthRateLimiter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // 인증 실패의 외부 트랜잭션이 롤백되어도 시도 횟수는 보존한다.
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = LimitExceeded.class)
    public void check(String bucket, int maximum, int seconds) {
        Instant now = Instant.now();
        int attempts =
                jdbc.queryForObject(
                        """
            INSERT INTO auth_rate_limit(bucket_hash, started_at, attempts) VALUES (?, ?, 1)
            ON CONFLICT (bucket_hash) DO UPDATE SET
              attempts = CASE WHEN auth_rate_limit.started_at < ? THEN 1 ELSE auth_rate_limit.attempts + 1 END,
              started_at = CASE WHEN auth_rate_limit.started_at < ? THEN excluded.started_at ELSE auth_rate_limit.started_at END
            RETURNING attempts
            """,
                        Integer.class,
                        AuthService.digest(bucket),
                        Timestamp.from(now),
                        Timestamp.from(now.minusSeconds(seconds)),
                        Timestamp.from(now.minusSeconds(seconds)));
        // 초과 요청도 커밋해야 하므로 호출자에서 한도 실패를 처리한다.
        if (attempts > maximum) throw new LimitExceeded();
    }

    static class LimitExceeded extends RuntimeException {}
}
