package kr.nadeulirang.backend.collection;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CollectionStoreTests {
    private static final String SCHEMA = "p11_test_" + UUID.randomUUID().toString().replace("-", "");
    private final JsonMapper json = JsonMapper.builder().build();
    private final Instant now = Instant.parse("2026-10-03T09:00:00Z");
    @Autowired private CollectionStore store;
    @Autowired private JdbcTemplate jdbc;

    @DynamicPropertySource static void schema(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.datasource.hikari.schema", () -> SCHEMA);
    }

    @BeforeEach void reset() {
        jdbc.execute("TRUNCATE outing, source_call, collection_checkpoint CASCADE");
        jdbc.update("UPDATE collection_source SET blocked_reason = NULL, last_started_at = NULL");
    }

    @Test @DisplayName("같은 시설 3행은 내부 ID를 유지하고 원문·필드 출처·기준일을 모두 남긴다")
    void keepsDuplicateHistory() {
        for (int i = 0; i < 3; i++) {
            JsonNode row = museum(i == 1 ? "대동로 1 (산격동)" : "대동로 1", "0", "202" + (4 + i) + "-01-01");
            save(Source.MUSEUM, row, "museum:one", now.plusSeconds(i * 2));
        }
        assertThat(count("outing")).isEqualTo(1);
        assertThat(count("source_record")).isEqualTo(1);
        assertThat(count("source_observation")).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT source_reference) FROM field_evidence", Integer.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT fee_status FROM outing", String.class)).isEqualTo("FREE");
        assertThat(jdbc.queryForObject("SELECT min(checked_at) FROM field_evidence", Timestamp.class).toInstant()).isEqualTo(now);
    }

    @Test @DisplayName("다른 원천의 요금 충돌은 미확인으로 두고 빈 요금을 0원으로 채우지 않는다")
    void preservesFeeConflicts() {
        save(Source.TOUR, json.readTree("{\"contentid\":\"1\",\"title\":\"박물관\",\"usefee\":\"3000\"}"), "TOUR:1", now);
        save(Source.MUSEUM, museum("대동로 1", "1000", "2025-01-01"), "TOUR:1", now.plusSeconds(2));
        assertThat(jdbc.queryForObject("SELECT fee_status FROM outing", String.class)).isEqualTo("UNKNOWN");
        assertThat(jdbc.queryForObject("SELECT fee_conflict FROM outing", Boolean.class)).isTrue();
        assertThat(count("source_observation")).isEqualTo(2);
        save(Source.MUSEUM, museum("대동로 2", "", "2025-01-01"), "museum:two", now.plusSeconds(4));
        assertThat(jdbc.queryForObject("SELECT adult_fee FROM outing WHERE review_key = 'museum:two'", java.math.BigDecimal.class)).isNull();
        save(Source.MUSEUM, museum("대동로 3", "0", "2025-01-01"), "museum:null", now.plusSeconds(6));
        var nullFee = museum("대동로 3", "0", "2026-01-01");
        ((tools.jackson.databind.node.ObjectNode) nullFee).putNull("adultChrge");
        save(Source.MUSEUM, nullFee, "museum:null", now.plusSeconds(8));
        assertThat(jdbc.queryForObject("SELECT fee_status FROM outing WHERE review_key = 'museum:null'", String.class)).isEqualTo("UNKNOWN");
    }

    @Test @DisplayName("최신 정상 응답에서 사라진 요금과 정상 0건을 과거 요금으로 채우지 않는다")
    void invalidatesRemovedFee() {
        save(Source.MUSEUM, museum("대동로 1", "3000", "2025-01-01"), "museum:one", now);
        var withoutFee = museum("대동로 1", "3000", "2026-01-01");
        ((tools.jackson.databind.node.ObjectNode) withoutFee).remove("adultChrge");
        save(Source.MUSEUM, withoutFee, "museum:one", now.plusSeconds(2));
        assertThat(jdbc.queryForObject("SELECT fee_status FROM outing", String.class)).isEqualTo("UNKNOWN");
        save(Source.MUSEUM, museum("대동로 1", "0", "2026-01-01"), "museum:one", now.plusSeconds(4));
        store.emptyOperation(Source.MUSEUM, CollectionPolicy.hash(CollectionStore.identity(Source.MUSEUM, withoutFee)), "list", now.plusSeconds(6));
        assertThat(jdbc.queryForObject("SELECT fee_status FROM outing", String.class)).isEqualTo("UNKNOWN");
        assertThat(count("source_observation")).isEqualTo(3);
    }

    @Test @DisplayName("원천 실패나 목록 누락은 마지막 성공·내부 ID·취소 상태를 바꾸지 않는다")
    void retainsDataAfterFailure() {
        JsonNode row = json.readTree("{\"contentid\":\"1\",\"title\":\"기간 행사\",\"eventstartdate\":\"20261001\",\"eventenddate\":\"20261003\"}");
        save(Source.TOUR, row, "TOUR:1", now);
        UUID id = jdbc.queryForObject("SELECT id FROM outing", UUID.class);
        store.failedRecord(Source.TOUR, "1", "detailIntro2", "22", now.plusSeconds(2));
        save(Source.TOUR, json.readTree("{\"contentid\":\"1\",\"usefee\":\"\"}"), "TOUR:1", now.plusSeconds(4));
        assertThat(jdbc.queryForObject("SELECT id FROM outing", UUID.class)).isEqualTo(id);
        assertThat(jdbc.queryForObject("SELECT lifecycle FROM outing", String.class)).isEqualTo("ACTIVE");
        // 다른 오퍼레이션의 성공으로 소개 정보의 실패를 지우지 않는다.
        assertThat(jdbc.queryForObject("SELECT last_failure_code FROM source_record", String.class)).isEqualTo("22");
        assertThat(count("source_observation")).isEqualTo(2);
    }

    @Test @DisplayName("비표출은 검색 후보에서 제외하고 공식 취소와 구분한다")
    void separatesHiddenAndCancelled() {
        save(Source.TOUR, json.readTree("{\"contentid\":\"1\",\"title\":\"施設\",\"showflag\":\"0\"}"), "TOUR:1", now);
        assertThat(count("public_candidate")).isZero();
        assertThat(jdbc.queryForObject("SELECT lifecycle FROM outing", String.class)).isEqualTo("UNKNOWN");
        store.reviewLifecycle("TOUR:1", "CANCELLED", "https://example.com/official", "공식 취소 공지를 확인한 테스트", now);
        save(Source.TOUR, json.readTree("{\"contentid\":\"1\",\"title\":\"施設\",\"showflag\":\"1\"}"), "TOUR:1", now.plusSeconds(2));
        assertThat(count("public_candidate")).isZero();
        assertThat(jdbc.queryForObject("SELECT lifecycle FROM outing", String.class)).isEqualTo("CANCELLED");
        assertThat(count("outing_review")).isEqualTo(1);
    }

    @Test @DisplayName("전년 축제와 올해 회차는 별도 ID로 두고 이전 ID 이관은 검토한 연결만 기록한다")
    void separatesOccurrencesAndMigration() {
        var old = json.readTree("""
                {"fstvlNm":"문화축전", "rdnmadr":"경상남도 양산시 1", "mnnstNm":"시청", "fstvlStartDate":"2025-09-26", "fstvlEndDate":"2025-09-28"}
                """);
        var next = old.deepCopy();
        ((tools.jackson.databind.node.ObjectNode) next).put("fstvlStartDate", "2026-09-26").put("fstvlEndDate", "2026-09-28");
        save(Source.FESTIVAL, old, null, now);
        save(Source.FESTIVAL, next, null, now.plusSeconds(2));
        assertThat(count("outing")).isEqualTo(2);
        save(Source.TOUR, json.readTree("{\"contentid\":\"old\",\"title\":\"시설\"}"), "TOUR:old", now.plusSeconds(4));
        save(Source.TOUR, json.readTree("{\"contentid\":\"new\",\"title\":\"시설\"}"), "TOUR:new", now.plusSeconds(6));
        UUID target = jdbc.queryForObject("SELECT id FROM outing WHERE review_key = 'TOUR:old'", UUID.class);
        store.relink(Source.TOUR, "new", "TOUR:old", "이전 ID 조회와 기관 주소를 대조한 테스트", now.plusSeconds(8));
        assertThat(jdbc.queryForObject("SELECT outing_id FROM source_record WHERE source_key = 'new'", UUID.class)).isEqualTo(target);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM source_link_history WHERE from_outing_id IS NOT NULL", Integer.class)).isEqualTo(1);
    }

    @Test @DisplayName("호출 예산은 오류·실행 중 요청을 포함하고 24시간 경계와 원천 중단을 적용한다")
    void enforcesDurableBudget() {
        var query = json.createObjectNode();
        UUID call = store.reserve(Source.TOUR, "detailCommon2", query, now);
        assertThatThrownBy(() -> store.reserve(Source.TOUR, "detailCommon2", query, now.plusMillis(999)))
                .isInstanceOf(IllegalStateException.class);
        store.finish(call, Source.TOUR, SourceResponse.failed("22"), now.plusSeconds(1));
        assertThatThrownBy(() -> store.reserve(Source.TOUR, "detailCommon2", query, now.plusSeconds(2)))
                .isInstanceOf(IllegalStateException.class);
        jdbc.update("UPDATE collection_source SET blocked_reason = NULL, last_started_at = NULL");
        jdbc.update("INSERT INTO source_call(id, source, operation, query, started_at, outcome) SELECT gen_random_uuid(), 'TOUR', 'test', '{}'::jsonb, ?, 'STARTED' FROM generate_series(1,799)", Timestamp.from(now));
        assertThatThrownBy(() -> store.reserve(Source.TOUR, "detailCommon2", query, now.plusSeconds(2)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(store.reserve(Source.TOUR, "detailCommon2", query, now.plusSeconds(86400))).isNotNull();
    }

    @Test @DisplayName("동시에 시작한 수집도 같은 원천의 요청 간격과 예산을 공유한다")
    void serializesConcurrentReservations() throws Exception {
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<Boolean> reserve = () -> {
                start.await();
                try { store.reserve(Source.TOUR, "detailCommon2", json.createObjectNode(), now); return true; }
                catch (IllegalStateException e) { return false; }
            };
            var first = executor.submit(reserve);
            var second = executor.submit(reserve);
            start.countDown();
            assertThat(java.util.List.of(first.get(), second.get())).containsExactlyInAnyOrder(true, false);
            assertThat(count("source_call")).isEqualTo(1);
        }
    }

    @Test @DisplayName("상세 성공 기한·원천 수정·실패에 따라 필요한 재조회를 결정한다")
    void schedulesDetailRefresh() {
        var common = json.readTree("{\"contentid\":\"1\",\"title\":\"시설\",\"modifiedtime\":\"20260101090000\"}");
        UUID call = store.reserve(Source.TOUR, "detailCommon2", json.createObjectNode(), now);
        store.finish(call, Source.TOUR, new SourceResponse("SUCCESS", "0000", common, java.util.List.of(common)), now);
        store.ingest(Source.TOUR, call, common, "detailCommon2", "TOUR:1", null, null, null, null, now);
        assertThat(store.needsDetails("1", "20260101090000", false, now)).isTrue();
        store.emptyOperation(Source.TOUR, "1", "detailIntro2", now);
        store.emptyOperation(Source.TOUR, "1", "detailInfo2", now);
        assertThat(store.needsDetails("1", "20260101090000", false, now.plusSeconds(29 * 86400))).isFalse();
        assertThat(store.needsDetails("1", "20260201090000", false, now)).isTrue();
        assertThat(store.needsDetails("1", "20260101090000", true, now.plusSeconds(7 * 86400))).isTrue();
        store.failedRecord(Source.TOUR, "1", "detailIntro2", "CONNECTION_FAILED", now.plusSeconds(2));
        assertThat(store.needsDetails("1", "20260101090000", false, now.plusSeconds(3))).isTrue();
    }

    @Test @DisplayName("같은 응답의 중복 행도 요금이 다르면 임의의 한 행을 채택하지 않는다")
    void keepsConflictsWithinOneResponse() {
        UUID call = store.reserve(Source.MUSEUM, "list", json.createObjectNode(), now);
        var first = museum("대동로 1", "1000", "2025-01-01");
        var second = museum("대동로 1", "3000", "2026-01-01");
        store.finish(call, Source.MUSEUM, new SourceResponse("SUCCESS", "00", first, java.util.List.of(first, second)), now);
        for (var row : java.util.List.of(first, second)) {
            store.ingest(Source.MUSEUM, call, row, "list", "museum:one", "MUSEUM", "27", "대구광역시", "검토 테스트", now);
        }
        assertThat(count("source_record")).isEqualTo(1);
        assertThat(count("source_observation")).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT fee_conflict FROM outing", Boolean.class)).isTrue();
        assertThat(jdbc.queryForObject("SELECT fee_status FROM outing", String.class)).isEqualTo("UNKNOWN");
    }

    @Test @DisplayName("정상 소개 0건은 행사 날짜를 미확인으로 바꾸고 원문을 보존한다")
    void clearsDatesAfterEmptyIntroduction() {
        var row = json.readTree("{\"contentid\":\"1\",\"title\":\"행사\",\"eventstartdate\":\"20261001\",\"eventenddate\":\"20261003\"}");
        UUID call = store.reserve(Source.TOUR, "detailIntro2", json.createObjectNode(), now);
        store.finish(call, Source.TOUR, new SourceResponse("SUCCESS", "0000", row, java.util.List.of(row)), now);
        store.ingest(Source.TOUR, call, row, "detailIntro2", "TOUR:1", "EVENT", "27", "대구광역시", "검토 테스트", now);
        store.emptyOperation(Source.TOUR, "1", "detailIntro2", now.plusSeconds(2));
        assertThat(jdbc.queryForObject("SELECT event_start FROM outing", java.time.LocalDate.class)).isNull();
        assertThat(jdbc.queryForObject("SELECT lifecycle FROM outing", String.class)).isEqualTo("UNKNOWN");
        assertThat(count("source_observation")).isEqualTo(1);
    }

    @Test @DisplayName("이미 저장한 보완 원천을 검토 후 연결하면 내부 ID와 요금 충돌을 다시 계산한다")
    void linksPreviouslyPendingSupplement() {
        save(Source.TOUR, json.readTree("{\"contentid\":\"1\",\"title\":\"박물관\",\"usefee\":\"3000\"}"), "TOUR:1", now);
        var row = museum("대동로 1", "1000", "2025-01-01");
        save(Source.MUSEUM, row, null, now.plusSeconds(2));
        String key = CollectionPolicy.hash(CollectionStore.identity(Source.MUSEUM, row));
        UUID target = jdbc.queryForObject("SELECT id FROM outing WHERE review_key = 'TOUR:1'", UUID.class);
        store.relink(Source.MUSEUM, key, "TOUR:1", "기관 소개·주소를 대조한 테스트", now.plusSeconds(4));
        assertThat(jdbc.queryForObject("SELECT outing_id FROM source_record WHERE source = 'MUSEUM'", UUID.class)).isEqualTo(target);
        assertThat(jdbc.queryForObject("SELECT fee_conflict FROM outing WHERE id = ?", Boolean.class, target)).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM source_link_history WHERE from_outing_id IS NOT NULL", Integer.class)).isEqualTo(1);
        assertThat(count("source_observation")).isEqualTo(2);
    }

    @Test @DisplayName("저장 도중 실패한 행은 원문과 제품 후보를 함께 되돌린다")
    void rollsBackInvalidRow() {
        UUID call = store.reserve(Source.TOUR, "detailCommon2", json.createObjectNode(), now);
        assertThatThrownBy(() -> store.ingest(Source.TOUR, call, json.readTree("{\"contentid\":\"1\",\"title\":\"施設\"}"), "detailCommon2", "TOUR:1", "INVALID_KIND", "27", "대구광역시", "테스트", now))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(count("outing")).isZero();
        assertThat(count("source_observation")).isZero();
        assertThat(count("source_call")).isEqualTo(1);
    }

    private void save(Source source, JsonNode row, String key, Instant time) {
        UUID call = store.reserve(source, "list", json.createObjectNode(), time);
        store.finish(call, source, new SourceResponse("SUCCESS", "00", row, java.util.List.of(row)), time);
        store.ingest(source, call, row, "list", key, "MUSEUM", "27", "대구광역시", "검토 테스트", time);
    }

    private JsonNode museum(String address, String fee, String reference) {
        return json.createObjectNode().put("fcltyNm", "대구교육박물관").put("rdnmadr", address)
                .put("operInstitutionNm", "교육청").put("adultChrge", fee).put("referenceDate", reference);
    }

    private int count(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class); }

    @AfterAll void removeSchema() { jdbc.execute("DROP SCHEMA \"" + SCHEMA + "\" CASCADE"); }
}
