package kr.nadeulirang.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("review")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ReviewEnvironmentTests {
    private static final String TEST_SCHEMA =
            "review_test_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.default-schema", () -> TEST_SCHEMA);
        registry.add("spring.flyway.schemas", () -> TEST_SCHEMA);
        registry.add("spring.datasource.hikari.schema", () -> TEST_SCHEMA);
    }

    @LocalServerPort private int port;
    @Autowired private HikariDataSource dataSource;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @DisplayName("검토 서버 readiness 반복 호출은 DB 연결을 만들지 않고 전체 health는 DB를 확인한다")
    void readinessDoesNotWakeDatabase() throws Exception {
        assertThat(dataSource.getMinimumIdle()).isZero();
        assertThat(dataSource.getKeepaliveTime()).isZero();
        var pool = dataSource.getHikariPoolMXBean();
        pool.softEvictConnections();
        for (int attempt = 0; attempt < 100 && pool.getTotalConnections() != 0; attempt++) {
            Thread.sleep(20);
        }
        assertThat(pool.getTotalConnections()).isZero();
        try (var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            for (int attempt = 0; attempt < 3; attempt++) {
                var readiness = get(client, "/actuator/health/readiness");
                assertThat(readiness.statusCode()).isEqualTo(200);
                assertThat(readiness.body()).isEqualTo("{\"status\":\"UP\"}");
            }
            assertThat(pool.getTotalConnections()).isZero();
            var health = get(client, "/actuator/health");
            assertThat(health.statusCode()).isEqualTo(200);
            assertThat(health.body())
                    .contains("\"status\":\"UP\"")
                    .doesNotContain("components", "details", "password", "jdbc:");
            assertThat(pool.getTotalConnections()).isPositive();
        }
    }

    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        var request =
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                        .timeout(Duration.ofSeconds(5))
                        .GET()
                        .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @AfterAll
    void removeTestSchema() {
        // 이 실행에서 만든 스키마만 정리하며 기존 앱 DB는 보존한다.
        jdbc.execute("DROP SCHEMA \"" + TEST_SCHEMA + "\" CASCADE");
    }
}
