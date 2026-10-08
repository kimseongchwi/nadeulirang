package kr.nadeulirang.backend.outing;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import kr.nadeulirang.backend.collection.CollectionStore;
import kr.nadeulirang.backend.collection.Source;
import kr.nadeulirang.backend.collection.SourceResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(OutingApiTests.TimeConfiguration.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OutingApiTests {
    private static final String SCHEMA = "p12_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final Instant NOW = Instant.parse("2026-10-05T14:59:59Z");
    private final JsonMapper json = JsonMapper.builder().build();
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CollectionStore collection;
    @Autowired private OutingStore outings;
    @LocalServerPort private int port;
    private int sequence;

    @TestConfiguration
    static class TimeConfiguration {
        @Bean @Primary Clock testClock() { return Clock.fixed(NOW, ZoneOffset.UTC); }
    }

    @DynamicPropertySource
    static void schema(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.datasource.hikari.schema", () -> SCHEMA);
    }

    @BeforeEach
    void reset() {
        jdbc.execute("TRUNCATE outing, source_call CASCADE");
        jdbc.update("UPDATE collection_source SET blocked_reason = NULL, last_started_at = NULL");
        sequence = 0;
    }

    @Test @DisplayName("검색 조건을 함께 적용하고 공백·특수문자·0건을 정상 응답한다")
    void filtersTogether() throws Exception {
        save("봄 100%_ 축제", "FESTIVAL", "11", "20261005", "20261006");
        save("다른 축제", "FESTIVAL", "48", "20261006", "20261010");
        save("박물관", "MUSEUM", "11", "", "");
        var filtered = get("?keyword=" + encode(" 100%_ ") + "&region=11&kind=FESTIVAL&period=ONGOING");
        assertThat(filtered.statusCode()).isEqualTo(200);
        assertThat(body(filtered).path("total").asLong()).isEqualTo(1);
        assertThat(body(filtered).path("items").get(0).path("name").asText()).isEqualTo("봄 100%_ 축제");
        assertThat(body(get("?keyword=" + encode("   "))).path("total").asLong()).isEqualTo(3);
        var empty = get("?keyword=" + encode("' OR 1=1 --"));
        assertThat(empty.statusCode()).isEqualTo(200);
        assertThat(body(empty).path("items").size()).isZero();
        assertThat(body(get("?region=99")).path("total").asLong()).isZero();
    }

    @Test @DisplayName("서울 자정과 시작·종료 포함 경계를 조회 때 다시 계산한다")
    void computesPeriodAtReadTime() {
        UUID endsToday = save("오늘 종료", "FESTIVAL", "11", "20261004", "20261005");
        UUID startsTomorrow = save("내일 시작", "EVENT", "48", "20261006", "20261007");
        jdbc.update("UPDATE outing SET lifecycle = 'ACTIVE' WHERE id = ?", endsToday);
        assertThat(outings.detail(endsToday, NOW).item().period()).isEqualTo("ONGOING");
        assertThat(outings.detail(startsTomorrow, NOW).item().period()).isEqualTo("UPCOMING");
        assertThat(outings.detail(startsTomorrow, NOW.plusSeconds(1)).item().period()).isEqualTo("ONGOING");
        assertThat(outings.detail(endsToday, NOW.plusSeconds(1)).item().period()).isEqualTo("ENDED");
        assertThat(outings.list(query("ALL", "DEFAULT", 1), NOW.plusSeconds(1)).total()).isEqualTo(1);
    }

    @Test @DisplayName("종료·취소는 목록에서 제외하고 공개 상세를 유지하며 숨김·미검토·이용제한 자료는 보호한다")
    void protectsPublicationBoundaries() throws Exception {
        UUID ended = save("지난 행사", "EVENT", "11", "20261001", "20261002");
        UUID cancelled = save("취소 행사", "EVENT", "11", "20261005", "20261006");
        UUID hidden = save("숨김", "MUSEUM", "11", "", "");
        UUID pending = save("미검토", "MUSEUM", "11", "", "");
        UUID unlicensed = save("이용제한", "MUSEUM", "11", "", "");
        UUID missingEvidence = save("원문 없음", "MUSEUM", "11", "", "");
        UUID unknownVisibility = save("표출 미확인", "MUSEUM", "11", "", "");
        UUID missingSource = save("출처 없음", "MUSEUM", "11", "", "");
        jdbc.update("UPDATE outing SET lifecycle = 'CANCELLED' WHERE id = ?", cancelled);
        jdbc.update("UPDATE outing SET visibility = 'HIDDEN' WHERE id = ?", hidden);
        jdbc.update("UPDATE outing SET review_status = 'PENDING' WHERE id = ?", pending);
        jdbc.update("UPDATE source_record SET license = 'UNKNOWN' WHERE outing_id = ?", unlicensed);
        jdbc.update("UPDATE outing SET visibility = 'UNKNOWN' WHERE id = ?", unknownVisibility);
        jdbc.update("DELETE FROM field_evidence WHERE observation_id IN (SELECT b.id FROM source_observation b JOIN source_record r ON r.id = b.record_id WHERE r.outing_id = ?)", missingEvidence);
        jdbc.update("DELETE FROM source_observation WHERE record_id IN (SELECT id FROM source_record WHERE outing_id = ?)", missingEvidence);
        jdbc.update("DELETE FROM field_evidence WHERE observation_id IN (SELECT b.id FROM source_observation b JOIN source_record r ON r.id = b.record_id WHERE r.outing_id = ?)", missingSource);
        jdbc.update("DELETE FROM source_observation WHERE record_id IN (SELECT id FROM source_record WHERE outing_id = ?)", missingSource);
        jdbc.update("DELETE FROM record_operation WHERE record_id IN (SELECT id FROM source_record WHERE outing_id = ?)", missingSource);
        jdbc.update("DELETE FROM source_link_history WHERE record_id IN (SELECT id FROM source_record WHERE outing_id = ?)", missingSource);
        jdbc.update("DELETE FROM source_record WHERE outing_id = ?", missingSource);
        assertThat(body(get("")).path("total").asLong()).isZero();
        assertThat(body(get("/" + ended)).path("item").path("period").asText()).isEqualTo("ENDED");
        assertThat(body(get("/" + cancelled)).path("item").path("period").asText()).isEqualTo("CANCELLED");
        for (UUID id : java.util.List.of(hidden, pending, unlicensed, missingEvidence, unknownVisibility, missingSource, UUID.randomUUID())) {
            var response = get("/" + id);
            assertThat(response.statusCode()).isEqualTo(404);
            assertThat(body(response).path("code").asText()).isEqualTo("NOT_FOUND");
            assertThat(response.body()).doesNotContain("숨김", "미검토", "이용제한");
        }
        assertThat(body(get("/options")).path("regions").size()).isZero();
    }

    @Test @DisplayName("기본 정렬과 20개 페이지를 안정된 ID로 유지하고 범위 밖 페이지는 0건이다")
    void sortsAndPaginates() throws Exception {
        save("미확인 행사", "EVENT", "11", "", "");
        save("시설", "MUSEUM", "11", "", "");
        save("나중 시작", "EVENT", "11", "20261007", "20261008");
        UUID first = save("먼저 시작", "EVENT", "11", "20261005", "20261008");
        for (int i = 0; i < 20; i++) save("동일 이름", "MUSEUM", "11", "", "");
        var page1 = body(get(""));
        var page2 = body(get("?page=2"));
        assertThat(page1.path("items").size()).isEqualTo(20);
        assertThat(page1.path("total").asLong()).isEqualTo(24);
        assertThat(page2.path("items").size()).isEqualTo(4);
        assertThat(page1.path("items").get(0).path("id").asText()).isEqualTo(first.toString());
        assertThat(page2.path("items").get(3).path("period").asText()).isEqualTo("UNKNOWN");
        assertThat(body(get("")).path("items")).isEqualTo(page1.path("items"));
        var firstIds = new java.util.HashSet<String>();
        page1.path("items").forEach(item -> firstIds.add(item.path("id").asText()));
        page2.path("items").forEach(item -> assertThat(firstIds).doesNotContain(item.path("id").asText()));
        assertThat(body(get("?page=2147483647")).path("items").size()).isZero();
        assertThat(body(get("?period=PERMANENT")).path("total").asLong()).isEqualTo(21);
        assertThat(body(get("?period=UNKNOWN")).path("total").asLong()).isEqualTo(1);
        assertThat(body(get("?sort=START_DATE")).path("items").get(0).path("id").asText()).isEqualTo(first.toString());
        assertThat(body(get("?sort=NAME")).path("items").get(0).path("name").asText()).isEqualTo("나중 시작");
    }

    @Test @DisplayName("선택지와 건수는 종료·숨김을 제외한 실제 조회 가능 자료에서 만든다")
    void exposesAvailableOptions() throws Exception {
        save("서울 박물관", "MUSEUM", "11", "", "");
        save("경남 행사", "EVENT", "48", "20261006", "20261007");
        save("종료 전시", "EXHIBITION", "47", "20260101", "20260102");
        var options = body(get("/options"));
        assertThat(options.path("total").asLong()).isEqualTo(2);
        assertThat(options.path("regions").size()).isEqualTo(2);
        assertThat(options.path("kinds").size()).isEqualTo(2);
        assertThat(options.toString()).doesNotContain("EXHIBITION", "47");
        assertThat(options.path("asOfDate").asText()).isEqualTo("2026-10-05");
    }

    @Test @DisplayName("홈은 구분별 정렬 후 세 개를 반환하고 다가오는 14일 경계를 포함한다")
    void homeSectionsAndWindow() throws Exception {
        save("오래 남은 행사", "EVENT", "11", "20261001", "20261030");
        UUID endingFirst = save("먼저 끝나는 행사", "EVENT", "11", "20261005", "20261005");
        save("다가오는 경계", "EVENT", "11", "20261019", "20261020");
        save("구간 밖", "EVENT", "11", "20261020", "20261021");
        save("내일 시작", "EVENT", "11", "20261006", "20261007");
        for (int i = 0; i < 24; i++) save(String.format("시설 %02d", i), "MUSEUM", "11", "", "");
        var home = body(get("/home?region=11"));
        assertThat(home.path("ongoing").get(0).path("id").asText()).isEqualTo(endingFirst.toString());
        assertThat(home.path("upcoming").size()).isEqualTo(2);
        assertThat(home.path("upcoming").get(0).path("name").asText()).isEqualTo("내일 시작");
        assertThat(home.path("upcoming").get(1).path("name").asText()).isEqualTo("다가오는 경계");
        assertThat(home.path("permanent").size()).isEqualTo(3);
        assertThat(home.path("permanent").get(0).path("name").asText()).isEqualTo("시설 00");
        assertThat(home.path("total").asLong()).isEqualTo(28);
        assertThat(home.path("days").asInt()).isEqualTo(14);
        assertThat(body(get("?period=UPCOMING&days=14")).path("total").asLong()).isEqualTo(2);
        assertThat(body(get("?period=UPCOMING")).path("total").asLong()).isEqualTo(3);
        assertThat(body(get("/home?region=99")).path("total").asLong()).isZero();
        assertThat(body(get("/home?kind=MUSEUM")).path("ongoing").size()).isZero();
    }

    @Test @DisplayName("기간 구간은 건수와 페이지를 나누기 전에 적용하고 잘못된 구간은 400이다")
    void windowBeforePagination() throws Exception {
        for (int i = 0; i < 24; i++) save("가까운 행사 " + i, "EVENT", "11", "20261006", "20261007");
        save("먼 훗날 행사", "EVENT", "11", "20261020", "20261021");
        var page = body(get("?period=UPCOMING&days=14&page=2"));
        assertThat(page.path("total").asLong()).isEqualTo(24);
        assertThat(page.path("items").size()).isEqualTo(4);
        assertThat(page.toString()).doesNotContain("먼 훗날");
        for (String path : java.util.List.of("?days=14", "?period=ONGOING&days=7", "?period=UPCOMING&days=15",
                "/home?days=0", "/home?days=15", "/home?days=14&days=7", "/home?page=1", "/home?kind=OTHER")) {
            assertThat(get(path).statusCode()).as(path).isEqualTo(400);
        }
    }

    @Test @DisplayName("상세는 실패·0건 뒤에도 기존 유효 값의 근거·확인 시각을 보존한다")
    void preservesProvenanceAndUnknowns() throws Exception {
        UUID id = save("방문 정보", "MUSEUM", "11", "", "");
        String key = jdbc.queryForObject("SELECT source_key FROM source_record WHERE outing_id = ?", String.class, id);
        Instant old = NOW.minusSeconds(31 * 86400L);
        ingest(json.readTree("{\"contentid\":\"" + key + "\",\"usefee\":\"0\",\"restdateculture\":\"월요일\",\"usetimeculture\":\"09:00~18:00\",\"discountinfo\":\"\",\"homepage\":\"https://example.org\",\"infotext\":\"주차 별도 요금\"}"), "detailIntro2", "MUSEUM", "11", old);
        collection.failedRecord(Source.TOUR, key, "detailIntro2", "22", NOW);
        var detail = body(get("/" + id));
        assertThat(detail.path("item").path("feeStatus").asText()).isEqualTo("FREE");
        assertThat(detail.path("item").path("adultFee").asInt()).isZero();
        assertThat(detail.path("information").path("hours").get(0).path("value").asText()).isEqualTo("09:00~18:00");
        assertThat(detail.path("information").path("hours").get(0).path("checkedAt").asText()).isEqualTo(old.toString());
        assertThat(detail.path("information").path("hours").get(0).path("stale").asBoolean()).isTrue();
        assertThat(detail.path("sources").get(0).path("lastFailureCode").asText()).isEqualTo("22");
        assertThat(detail.path("sources").get(0).path("checkedAt").asText()).isEqualTo(old.toString());
        assertThat(detail.path("sources").get(0).path("stale").asBoolean()).isTrue();
        assertThat(detail.path("unconfirmed").toString()).contains("discount", "operation", "reservationPeriod");
        assertThat(detail.path("information").path("extraFee").size()).isZero();
        assertThat(detail.path("information").path("notes").size()).isEqualTo(1);
        assertThat(detail.path("links").get(0).path("url").asText()).isEqualTo("https://example.org");
        assertThat(detail.toString()).doesNotContain("review_key", "raw_row", "serviceKey");
        collection.emptyOperation(Source.TOUR, key, "detailIntro2", NOW.plusSeconds(1));
        var cleared = body(get("/" + id));
        assertThat(cleared.path("information").path("hours").get(0).path("value").asText()).isEqualTo("09:00~18:00");
        assertThat(cleared.path("item").path("feeStatus").asText()).isEqualTo("FREE");
        assertThat(cleared.path("item").path("adultFee").asInt()).isZero();
        assertThat(cleared.path("sources").get(0).path("lastFailureCode").asText()).isEqualTo("EMPTY_DETAIL");
    }

    @Test @DisplayName("반복 안내의 빈 보완 본문은 기존 본문과 같은 원문의 제목·근거를 함께 보존한다")
    void preservesNoteTitleFromSameObservation() throws Exception {
        UUID id = save("반복 안내", "EVENT", "11", "20261001", "20261008");
        String key = jdbc.queryForObject("SELECT source_key FROM source_record WHERE outing_id=?", String.class, id);
        var row = json.createObjectNode().put("contentid", key).put("serialnum", "1")
                .put("infoname", "행사내용").put("infotext", "주요프로그램 : 드론 공연");
        Instant old = NOW.minusSeconds(10);
        ingest(row, "detailInfo2", "EVENT", "11", old);
        ingest(row.deepCopy().put("infoname", "변경된 빈 안내").put("infotext", ""), "detailInfo2", "EVENT", "11", NOW);
        var notes = body(get("/" + id)).path("information").path("notes");
        assertThat(notes.size()).isEqualTo(2);
        var title = notes.get(0).path("field").asText().equals("infoname") ? notes.get(0) : notes.get(1);
        var text = notes.get(0).path("field").asText().equals("infotext") ? notes.get(0) : notes.get(1);
        assertThat(title.path("value").asText()).isEqualTo("행사내용");
        assertThat(text.path("value").asText()).isEqualTo("주요프로그램 : 드론 공연");
        assertThat(title.path("observationId").asText()).isEqualTo(text.path("observationId").asText());
        assertThat(text.path("checkedAt").asText()).isEqualTo(old.toString());
    }

    @Test @DisplayName("유효하지 않은 입력은 400이며 DB 장애는 상세 없음과 다른 재시도 가능한 503이다")
    void distinguishesErrors() throws Exception {
        for (String path : java.util.List.of("?page=0", "?page=-1", "?page=abc", "?page=2147483648", "?kind=OTHER",
                "?period=ENDED", "?sort=name;DROP", "?keyword=" + "x".repeat(201), "?date=2026-10-06",
                "?page=1&page=2", "/invalid-id")) {
            var response = get(path);
            assertThat(response.statusCode()).as(path).isEqualTo(400);
            assertThat(body(response).path("code").asText()).isEqualTo("INVALID_REQUEST");
        }
        jdbc.execute("ALTER TABLE outing RENAME TO outing_unavailable");
        try {
            for (String path : java.util.List.of("", "/home", "/options", "/" + UUID.randomUUID())) {
                var response = get(path);
                assertThat(response.statusCode()).isEqualTo(503);
                assertThat(body(response).path("retryable").asBoolean()).isTrue();
                assertThat(response.body()).doesNotContain("SELECT", "jdbc:", SCHEMA);
            }
        } finally {
            jdbc.execute("ALTER TABLE outing_unavailable RENAME TO outing");
        }
    }

    @Test @DisplayName("원천별 요금 충돌과 HTML·예약 문장의 미확인을 보존하고 위험한 링크는 연결하지 않는다")
    void keepsConflictsWithoutGuessing() throws Exception {
        UUID id = save("충돌 시설", "MUSEUM", "11", "", "");
        String key = jdbc.queryForObject("SELECT source_key FROM source_record WHERE outing_id = ?", String.class, id);
        var row = json.createObjectNode().put("contentid", key).put("usefee", "3000")
                .put("homepage", "<a href=\"https://example.org/info\">공식 안내</a>")
                .put("bookingplace", "예약 시 운영 javascript:alert(1)").put("discountinfo", "대상 조건 확인 필요");
        ingest(row, "detailIntro2", "MUSEUM", "11", NOW.minusSeconds(50));
        var museum = json.createObjectNode().put("fcltyNm", "충돌 시설").put("rdnmadr", "도로 1")
                .put("operInstitutionNm", "검토 기관").put("adultChrge", "1000").put("homepageUrl", "https://example@example.org");
        UUID call = UUID.randomUUID();
        jdbc.update("INSERT INTO source_call(id, source, operation, query, started_at, outcome) VALUES (?, 'MUSEUM', 'list', '{}'::jsonb, ?, 'STARTED')",
                call, java.sql.Timestamp.from(NOW));
        collection.finish(call, Source.MUSEUM, new SourceResponse("SUCCESS", "00", museum, java.util.List.of(museum)), NOW);
        String reviewKey = jdbc.queryForObject("SELECT review_key FROM outing WHERE id = ?", String.class, id);
        collection.ingest(Source.MUSEUM, call, museum, "list", reviewKey, "MUSEUM", "11", "지역 11", "테스트 검토", NOW);
        var detail = body(get("/" + id));
        assertThat(detail.path("item").path("feeStatus").asText()).isEqualTo("UNKNOWN");
        assertThat(detail.path("item").path("adultFee").isNull()).isTrue();
        assertThat(detail.path("item").path("feeConflict").asBoolean()).isTrue();
        assertThat(detail.path("information").path("generalFee").size()).isEqualTo(2);
        assertThat(detail.path("links").size()).isEqualTo(1);
        assertThat(detail.path("links").get(0).path("url").asText()).isEqualTo("https://example.org/info");
        assertThat(detail.path("unconfirmed").toString()).contains("adultFee", "discountConditions", "reservationLink");
        // 다른 오퍼레이션의 새 성공으로 오래된 운영 근거가 최신으로 바뀌지 않는다.
        jdbc.update("UPDATE field_evidence SET checked_at = ? WHERE field_name = 'discountinfo'",
                java.sql.Timestamp.from(NOW.minusSeconds(31 * 86400L)));
        var olderEvidence = body(get("/" + id));
        assertThat(olderEvidence.path("information").path("discount").get(0).path("stale").asBoolean()).isTrue();
        assertThat(olderEvidence.path("sources").get(0).path("stale").asBoolean()).isFalse();
    }

    @Test @DisplayName("대표 사진은 중복 없이 재수집하고 실패 보존·유형 변경·사진 제거를 반영한다")
    void storesRepresentativePhotoHistory() throws Exception {
        UUID id = save("사진 시설", "MUSEUM", "11", "", "");
        var row = json.createObjectNode().put("contentid", "1").put("title", "사진 시설")
            .put("firstimage", "http://tong.visitkorea.or.kr/cms/resource/01/123_image2_1.jpg")
            .put("firstimage2", "https://tong.visitkorea.or.kr/cms/resource/01/123_image3_1.jpg")
            .put("cpyrhtDivCd", "Type1");
        ingest(row, "detailCommon2", "MUSEUM", "11", NOW.minusSeconds(10));
        ingest(row, "detailCommon2", "MUSEUM", "11", NOW.minusSeconds(8));
        var photo = body(get("/" + id)).path("item").path("photo");
        assertThat(photo.path("url").asText()).isEqualTo("https://tong.visitkorea.or.kr/cms/resource/01/123_image2_1.jpg");
        assertThat(photo.path("license").asText()).isEqualTo("KOGL1");
        assertThat(photo.path("provider").asText()).isEqualTo("한국관광공사 TourAPI");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM file_asset", Integer.class)).isEqualTo(1);
        assertThat(outings.list(query("ALL", "DEFAULT", 1), NOW).items().getFirst().photo().id()).isEqualTo(UUID.fromString(photo.path("id").asText()));
        collection.failedRecord(Source.TOUR, "1", "detailCommon2", "CONNECTION_FAILED", NOW.minusSeconds(6));
        assertThat(outings.detail(id, NOW).item().photo()).isNotNull();
        ingest(row.put("cpyrhtDivCd", "Type3"), "detailCommon2", "MUSEUM", "11", NOW.minusSeconds(4));
        assertThat(outings.detail(id, NOW).item().photo()).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM file_asset WHERE active", Integer.class)).isZero();
        ingest(row.put("cpyrhtDivCd", "Type1").put("firstimage", "https://tong.visitkorea.or.kr/cms/resource/01/124_image2_1.jpg"), "detailCommon2", "MUSEUM", "11", NOW.minusSeconds(2));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM file_asset", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM file_asset WHERE active", Integer.class)).isEqualTo(1);
        ingest(row.put("firstimage", ""), "detailCommon2", "MUSEUM", "11", NOW);
        assertThat(outings.detail(id, NOW).item().photo()).isNull();
    }

    @Test @DisplayName("임의 호스트·쿼리·미확인 유형 사진은 거부하고 비공개 항목의 사진을 노출하지 않는다")
    void protectsPhotoBoundaries() throws Exception {
        UUID id = save("사진 시설", "MUSEUM", "11", "", "");
        var row = json.createObjectNode().put("contentid", "1").put("title", "사진 시설").put("cpyrhtDivCd", "Type1");
        String allowed = "https://tong.visitkorea.or.kr/cms/resource/01/123_image2_1.jpg";
        int index = 0;
        for (String bad : java.util.List.of("https://evil.example/x.jpg", allowed + "?serviceKey=x", "https://tong.visitkorea.or.kr.evil.example/x.jpg", "javascript:x")) {
            ingest(row.put("firstimage", bad), "detailCommon2", "MUSEUM", "11", NOW.minusSeconds(20).plusSeconds(index++));
            assertThat(outings.detail(id, NOW).item().photo()).isNull();
        }
        for (String license : java.util.List.of("", "Type2", "Type3", "Type4")) {
            ingest(row.put("firstimage", allowed).put("cpyrhtDivCd", license), "detailCommon2", "MUSEUM", "11", NOW.minusSeconds(10).plusSeconds(index++));
            assertThat(outings.detail(id, NOW).item().photo()).isNull();
        }
        ingest(row.put("cpyrhtDivCd", "Type1"), "detailCommon2", "MUSEUM", "11", NOW);
        jdbc.update("UPDATE outing SET visibility='HIDDEN' WHERE id=?", id);
        assertThat(get("/" + id).statusCode()).isEqualTo(404);
        assertThat(body(get("")).path("total").asLong()).isZero();
    }

    @Test @DisplayName("목록·홈·상세에 최신 주소의 같은 시군구를 제공하고 충돌·누락·옛 주소는 제외한다")
    void sharesConfirmedDistrictAcrossSummaries() throws Exception {
        UUID id = save("지역 행사", "EVENT", "26", "20261005", "20261006");
        var row = json.createObjectNode().put("contentid", "1").put("title", "지역 행사")
            .put("addr1", "지역 26 해운대구 우동");
        ingest(row, "detailCommon2", "EVENT", "26", NOW.minusSeconds(30));
        ingest(row.put("addr1", "지역 26 수영구 광안동").put("addr2", "해운대구 표본 설명"),
            "detailCommon2", "EVENT", "26", NOW.minusSeconds(20));
        assertThat(body(get("")).path("items").get(0).path("districtName").asText()).isEqualTo("수영구");
        assertThat(body(get("/home")).path("ongoing").get(0).path("districtName").asText()).isEqualTo("수영구");
        assertThat(body(get("/" + id)).path("item").path("districtName").asText()).isEqualTo("수영구");
        assertThat(outings.detail(id, NOW).information().get("address")).anyMatch(e -> e.field().equals("addr2"));
        var other = json.createObjectNode().put("contentid", "1").put("rdnmadr", "지역 26 해운대구 길 1");
        ingest(other, "detailIntro2", "EVENT", "26", NOW.minusSeconds(10));
        assertThat(outings.list(query("ALL", "DEFAULT", 1), NOW).items().getFirst().districtName()).isNull();
        ingest(other.put("rdnmadr", ""), "detailIntro2", "EVENT", "26", NOW.minusSeconds(5));
        assertThat(outings.detail(id, NOW).item().districtName()).isEqualTo("수영구");
        ingest(row.put("addr1", ""), "detailCommon2", "EVENT", "26", NOW);
        assertThat(outings.detail(id, NOW).item().districtName()).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM field_evidence WHERE field_name='addr1' AND value #>> '{}' LIKE '%해운대구%'", Integer.class)).isPositive();
    }

    @Test @DisplayName("최신 표준 안내를 표시하고 이전 요금 차이와 모든 근거를 보존한다")
    void compactsDisplayWithoutLosingEvidence() throws Exception {
        UUID id = save("중복 박물관", "MUSEUM", "27", "", "");
        ingest(json.createObjectNode().put("contentid", "1").put("title", "중복 박물관")
                .put("addr1", "대구광역시 도로 66").put("homepage", "https://example.org/info")
                .put("tel", "053-659-4900"), "detailCommon2", "MUSEUM", "27", NOW.minusSeconds(10));
        var first = json.createObjectNode().put("fcltyNm", "중복 박물관").put("rdnmadr", "대구광역시 도로 66")
                .put("lnmadr", "대구광역시 상리 971").put("operInstitutionNm", "박물관")
                .put("weekdayOperOpenHhmm", "09:30").put("holidayOperOpenHhmm", "09:30")
                .put("adultChrge", "3000").putNull("childChrge").put("phoneNumber", "053-659-4900")
                .put("homepageUrl", "https://example.org/info").put("referenceDate", "2025-12-10");
        var second = first.deepCopy().put("adultChrge", "0").put("referenceDate", "2026-06-24");
        UUID call = UUID.randomUUID();
        jdbc.update("INSERT INTO source_call(id, source, operation, query, started_at, outcome) VALUES (?, 'MUSEUM', 'list', '{}'::jsonb, ?, 'STARTED')",
                call, java.sql.Timestamp.from(NOW));
        collection.finish(call, Source.MUSEUM, new SourceResponse("SUCCESS", "00", first, java.util.List.of(first, second)), NOW);
        for (var row : java.util.List.of(first, second)) collection.ingest(Source.MUSEUM, call, row, "list", "TOUR:1",
                "MUSEUM", "27", "대구광역시", "테스트 검토", NOW);
        var detail = body(get("/" + id));
        assertThat(detail.path("information").path("address").size()).isEqualTo(2);
        assertThat(detail.path("information").path("hours").size()).isEqualTo(2);
        assertThat(detail.path("information").path("contact").size()).isEqualTo(1);
        assertThat(detail.path("information").path("generalFee").size()).isEqualTo(1);
        assertThat(detail.path("information").path("generalFee").get(0).path("value").asText()).isEqualTo("0");
        assertThat(detail.path("information").path("generalFee").get(0).path("sourceReference").asText()).isEqualTo("2026-06-24");
        assertThat(detail.path("links").size()).isEqualTo(1);
        assertThat(detail.path("item").path("feeConflict").asBoolean()).isFalse();
        assertThat(detail.path("item").path("adultFee").asInt()).isZero();
        var evidence = detail.path("evidence");
        assertThat(evidence.size()).isEqualTo(19);
        int missingFees = 0;
        for (var entry : evidence) if (entry.path("field").asText().equals("childChrge") && entry.path("value").isNull()) missingFees++;
        assertThat(missingFees).isEqualTo(2);
        assertThat(evidence.toString()).doesNotContain("fcltyNm", "operInstitutionNm", "contentid");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM source_observation b JOIN source_record r ON r.id=b.record_id WHERE r.outing_id=?",
                Integer.class, id)).isEqualTo(4);
    }

    private UUID save(String name, String kind, String region, String start, String end) {
        var row = json.createObjectNode().put("contentid", Integer.toString(++sequence)).put("title", name)
                .put("eventstartdate", start).put("eventenddate", end).put("addr1", "확보한 주소");
        ingest(row, "detailCommon2", kind, region, NOW.minusSeconds(3600).plusSeconds(sequence * 2L));
        return jdbc.queryForObject("SELECT outing_id FROM source_record WHERE source_key = ?", UUID.class, row.path("contentid").asText());
    }

    private void ingest(JsonNode row, String operation, String kind, String region, Instant time) {
        // 테스트 입력은 호출 제한과 별개로 근거/제품 저장 흐름을 검증한다.
        UUID call = UUID.randomUUID();
        jdbc.update("INSERT INTO source_call(id, source, operation, query, started_at, outcome) VALUES (?, 'TOUR', ?, '{}'::jsonb, ?, 'STARTED')",
                call, operation, java.sql.Timestamp.from(time));
        collection.finish(call, Source.TOUR, new SourceResponse("SUCCESS", "0000", row, java.util.List.of(row)), time);
        collection.ingest(Source.TOUR, call, row, operation, null, kind, region, "지역 " + region, "테스트 검토", time);
    }

    private OutingQuery query(String period, String sort, int page) { return new OutingQuery("", "", "", period, sort, page); }
    private String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    private JsonNode body(HttpResponse<String> response) { return json.readTree(response.body()); }

    private HttpResponse<String> get(String path) throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/outings" + path))
                    .timeout(java.time.Duration.ofSeconds(10)).GET().build(), HttpResponse.BodyHandlers.ofString());
        }
    }

    @AfterAll
    void cleanup() {
        // 이번 실행의 격리 스키마만 삭제한다.
        jdbc.execute("DROP SCHEMA \"" + SCHEMA + "\" CASCADE");
    }
}
