package kr.nadeulirang.backend;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class NadeulirangApplicationTests {

	private static final String TEST_SCHEMA = "p10_test_" + UUID.randomUUID().toString().replace("-", "");

	@DynamicPropertySource
	static void isolatedSchema(DynamicPropertyRegistry registry) {
		registry.add("spring.flyway.default-schema", () -> TEST_SCHEMA);
		registry.add("spring.flyway.schemas", () -> TEST_SCHEMA);
		registry.add("spring.datasource.hikari.schema", () -> TEST_SCHEMA);
	}

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private Flyway flyway;

	@LocalServerPort
	private int port;

	@Test
	@DisplayName("실제 PostgreSQL 접속과 서울 시간대를 확인한다")
	void connectsToPostgresql() {
		assertThat(jdbc.queryForObject("SELECT version()", String.class)).startsWith("PostgreSQL");
		assertThat(jdbc.queryForObject("SHOW TimeZone", String.class)).isEqualTo("Asia/Seoul");
		assertThat(jdbc.queryForObject("SELECT current_schema()", String.class)).isEqualTo(TEST_SCHEMA);
	}

	@Test
	@DisplayName("초기 마이그레이션을 적용하고 재실행해도 중복 적용하지 않는다")
	void migratesSchemaOnce() {
		flyway.validate();
		assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("3");
		assertThat(jdbc.queryForObject("SELECT obj_description(oid, 'pg_namespace') FROM pg_namespace WHERE nspname = ?",
				String.class, TEST_SCHEMA)).isEqualTo("나들이랑 애플리케이션 데이터");
		assertThat(flyway.migrate().migrationsExecuted).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM \"" + TEST_SCHEMA
				+ "\".flyway_schema_history WHERE version = '1' AND success", Integer.class)).isEqualTo(1);
	}

	@Test
	@DisplayName("HTTP health는 정상 상태만 공개하고 환경 설정 엔드포인트는 노출하지 않는다")
	void servesHealthWithoutDetails() throws Exception {
		try (HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
			var health = client.send(request("/actuator/health"), HttpResponse.BodyHandlers.ofString());
			assertThat(health.statusCode()).isEqualTo(200);
			assertThat(health.body()).isEqualTo("{\"status\":\"UP\"}");
			var environment = client.send(request("/actuator/env"), HttpResponse.BodyHandlers.ofString());
			assertThat(environment.statusCode()).isEqualTo(404);
		}
	}

	private HttpRequest request(String path) {
		return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
				.timeout(Duration.ofSeconds(5)).GET().build();
	}

	@AfterAll
	void removeTestSchema() {
		// 이 실행에서 생성한 UUID 스키마만 삭제하며 앱 데이터에는 접근하지 않는다.
		jdbc.execute("DROP SCHEMA \"" + TEST_SCHEMA + "\" CASCADE");
	}

}
