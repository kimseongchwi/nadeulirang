package kr.nadeulirang.backend.collection;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;

class CollectionPolicyTests {
    private final JsonMapper json = JsonMapper.builder().build();

    @Test @DisplayName("보완 수집은 명시한 상세 오퍼레이션만 허용하고 중복·목록 호출을 거부한다")
    void validatesSupplementOperations() {
        assertThat(CollectionRunner.supplementOperations("detailInfo2")).containsExactly("detailInfo2");
        assertThat(CollectionRunner.supplementOperations("detailIntro2,detailInfo2")).containsExactly("detailIntro2", "detailInfo2");
        for (String value : java.util.List.of("", "list", "detailInfo2,detailInfo2", "detailCommon2", "detailIntro2,"))
            assertThatThrownBy(() -> CollectionRunner.supplementOperations(value)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test @DisplayName("표준 보완은 대상 원천만 선택하고 빈 대상·잘못된 원천을 거부한다")
    void selectsOnlySupplementSources() {
        assertThat(CollectionRunner.supplementSources(json.readTree("{\"tour\":[],\"standard\":[{\"source\":\"MUSEUM\"}]}")))
                .containsExactly(Source.MUSEUM);
        assertThat(CollectionRunner.supplementSources(json.readTree("{\"tour\":[{\"id\":\"1\"}],\"standard\":[]}")))
                .containsExactly(Source.TOUR);
        for (String value : java.util.List.of("{\"tour\":[],\"standard\":[]}", "{\"tour\":[],\"standard\":[{\"source\":\"TOUR\"}]}"))
            assertThatThrownBy(() -> CollectionRunner.supplementSources(json.readTree(value))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test @DisplayName("누락·조건 문장·교통비를 무료나 일반 입장료로 변환하지 않는다")
    void distinguishesMissingFees() {
        assertThat(CollectionPolicy.numericFee("")).isNull();
        assertThat(CollectionPolicy.numericFee(null)).isNull();
        assertThat(CollectionPolicy.numericFee("셔틀버스 3,000원")).isNull();
        assertThat(CollectionPolicy.numericFee("군민 무료")).isNull();
        assertThat(CollectionPolicy.numericFee("0")).isEqualByComparingTo("0");
        assertThat(CollectionPolicy.numericFee("3000")).isEqualByComparingTo("3000");
    }

    @Test @DisplayName("기간 전시·행사·미술관 혼합 분류를 코드로 구분한다")
    void mapsReviewedKinds() {
        assertThat(CollectionPolicy.tourKind("15", "EV", "EV03", "EV030100")).isEqualTo("EXHIBITION");
        assertThat(CollectionPolicy.tourKind("15", "EV", "EV03", "EV030400")).isEqualTo("EVENT");
        assertThat(CollectionPolicy.tourKind("14", "VE", "VE07", "VE070600")).isNull();
        assertThat(CollectionPolicy.tourKind("12", "NA", "NA01", "NA010100")).isNull();
    }

    @Test @DisplayName("서울 날짜 종료 경계와 갱신 기한의 포함 여부를 구분한다")
    void checksTimeBoundaries() {
        Instant midnight = Instant.parse("2026-10-03T15:00:00Z");
        assertThat(CollectionPolicy.lifecycle(LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-03"), false, midnight.minusNanos(1))).isEqualTo("ACTIVE");
        assertThat(CollectionPolicy.lifecycle(LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-03"), false, midnight)).isEqualTo("ENDED");
        assertThat(CollectionPolicy.lifecycle(null, null, true, midnight)).isEqualTo("CANCELLED");
        assertThat(CollectionPolicy.stale(true, midnight.minusSeconds(48 * 3600), midnight)).isFalse();
        assertThat(CollectionPolicy.stale(true, midnight.minusSeconds(48 * 3600).minusNanos(1), midnight)).isTrue();
        assertThat(CollectionPolicy.detailDue(true, false, midnight.minusSeconds(7 * 86400), midnight)).isTrue();
        assertThat(CollectionPolicy.detailDue(false, false, midnight.minusSeconds(29 * 86400), midnight)).isFalse();
        assertThat(CollectionPolicy.date("20260230")).isNull();
    }

    @Test @DisplayName("시설의 괄호·공백은 정리하되 번지와 축제의 다른 회차는 보존한다")
    void preservesIdentityBoundaries() {
        var one = json.readTree("""
                {"fcltyNm":"대구 교육 박물관", "rdnmadr":"대구광역시 북구 대동로 1 (산격동)", "operInstitutionNm":"교육청"}
                """);
        var two = json.readTree("""
                {"fcltyNm":"대구교육박물관", "rdnmadr":"대구광역시 북구 대동로 1", "operInstitutionNm":"교육청"}
                """);
        var three = json.readTree("""
                {"fcltyNm":"대구교육박물관", "rdnmadr":"대구광역시 북구 대동로 11", "operInstitutionNm":"교육청"}
                """);
        assertThat(CollectionStore.identity(Source.MUSEUM, one)).isEqualTo(CollectionStore.identity(Source.MUSEUM, two));
        assertThat(CollectionStore.identity(Source.MUSEUM, one)).isNotEqualTo(CollectionStore.identity(Source.MUSEUM, three));
        var festival = json.readTree("""
                {"fstvlNm":"문화축전", "rdnmadr":"경상남도 양산시 1", "mnnstNm":"시청", "fstvlStartDate":"2025-09-26", "fstvlEndDate":"2025-09-28"}
                """);
        var next = festival.deepCopy();
        ((tools.jackson.databind.node.ObjectNode) next).put("fstvlStartDate", "2026-09-26");
        assertThat(CollectionStore.identity(Source.FESTIVAL, festival)).isNotEqualTo(CollectionStore.identity(Source.FESTIVAL, next));
    }

    @Test @DisplayName("정상 0건·표준 데이터 없음·잘못된 본문·원천 오류를 구분하고 키를 제거한다")
    void validatesSourceBodies() {
        String empty = "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"totalCount\":0,\"items\":\"\"}}}";
        assertThat(SourceResponse.parse(Source.TOUR, 200, empty, "secret").outcome()).isEqualTo("EMPTY");
        assertThat(SourceResponse.parse(Source.TOUR, 200, empty.replace("totalCount\":0", "totalCount\":1"), "secret").outcome()).isEqualTo("FAILED");
        assertThat(SourceResponse.parse(Source.MUSEUM, 200, "{\"response\":{\"header\":{\"resultCode\":\"03\"}}}", "secret").outcome()).isEqualTo("EMPTY");
        assertThat(SourceResponse.parse(Source.MUSEUM, 500, "{\"resultCode\":\"03\"}", "secret").outcome()).isEqualTo("FAILED");
        assertThat(SourceResponse.parse(Source.TOUR, 200, "<html>secret</html>", "secret").payload()).isNull();
        String success = "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"totalCount\":1,\"items\":{\"item\":[{\"title\":\"secret\"}]}}}}";
        assertThat(SourceResponse.parse(Source.TOUR, 200, success, "secret").payload().toString()).doesNotContain("secret");
        String escaped = success.replace("secret", "\\u0073ecret");
        assertThat(SourceResponse.parse(Source.TOUR, 200, escaped, "secret").payload().toString()).doesNotContain("secret");
        assertThat(SourceResponse.parse(Source.TOUR, 200, "<returnReasonCode>22</returnReasonCode>", "secret").code()).isEqualTo("22");
        assertThat(CollectionPolicy.blockingCode("22")).isEqualTo("22");
        assertThat(CollectionPolicy.blockingCode("23")).isEqualTo("23");
        assertThat(CollectionPolicy.blockingCode("10")).isNull();
    }

    @Test @DisplayName("임의 주소·키 매개변수·과도한 페이지 크기·위험 링크를 거부한다")
    void constrainsRequests() {
        assertThatThrownBy(() -> SourceClient.buildUri(Source.TOUR, "../../evil", json.createObjectNode(), "test")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceClient.buildUri(Source.TOUR, "detailCommon2", json.createObjectNode().put("serviceKey", "test"), "test")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceClient.buildUri(Source.MUSEUM, "list", json.createObjectNode().put("numOfRows", 100), "test")).isInstanceOf(IllegalArgumentException.class);
        assertThat(CollectionPolicy.safeLink("javascript:alert(1)")).isNull();
        assertThat(CollectionPolicy.safeLink("https://user:pass@example.com")).isNull();
        assertThat(CollectionPolicy.safeLink("안내 <a href=\"https://example.com/info\">관람</a>")).isEqualTo("https://example.com/info");
    }

    @Test @DisplayName("TourAPI의 감싼 응답과 표준 원천의 바로 시작하는 본문에서 전체 건수를 읽는다")
    void readsBothTotalShapes() {
        String response = "{\"header\":{\"resultCode\":\"00\"},\"body\":{\"totalCount\":1076,\"items\":[{\"fcltyNm\":\"검증 박물관\"}]}}";
        assertThat(SourceResponse.parse(Source.MUSEUM,200,response,"test").totalCount()).isEqualTo(1076);
        String wrapped = "{\"response\":"+response.replace("\"00\"","\"0000\"")+"}";
        assertThat(SourceResponse.parse(Source.TOUR,200,wrapped,"test").totalCount()).isEqualTo(1076);
        assertThat(SourceResponse.failed("CONNECTION_FAILED").totalCount()).isZero();
    }
}
