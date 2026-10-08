package kr.nadeulirang.backend.outing;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class OutingInformationTests {
    @Test @DisplayName("표준 기준일로 행 전체를 선택하고 빈 최신 값·동일 기준일 차이와 다른 원천을 보존한다")
    void selectsStandardRowsByReferenceDate() {
        var old = entry("adultChrge", "3000", "2025-12-10", 9);
        var oldChild = entry("childChrge", "1000", "2025-12-10", 9);
        var recent = entry("adultChrge", "0", "2026-06-24", 0);
        var missing = entry("childChrge", null, "2026-06-24", 0);
        var sameDate = entry("adultChrge", "2000", "2026-06-24", 1);
        var tour = new OutingResponse.Evidence("usefee", "3000", "TOUR", "관광자료", old.url(), null,
                old.collectedAt(), old.checkedAt(), false, UUID.randomUUID());
        var other = new OutingResponse.Evidence("adultChrge", "1000", "MUSEUM", "별도 시설", old.url(), "2024-01-01",
                old.collectedAt(), old.checkedAt(), false, UUID.randomUUID());
        var values = List.of(old, oldChild, recent, missing, sameDate, tour, other);
        var selected = OutingInformation.latestStandardRows(values);
        assertThat(selected).containsExactly(recent, missing, sameDate, tour, other);
        assertThat(OutingInformation.preferStandard(selected)).containsExactly(recent, missing, sameDate, other);
        assertThat(values).hasSize(7);
    }

    @Test @DisplayName("표준 기준일이 없거나 잘못된 경우 임의로 최신 행을 고르지 않고 관광 정보로 보완한다")
    void preservesUnrankedRowsAndFallback() {
        var missing = entry("rstdeInfo", "월요일", "", 0);
        var invalid = entry("rstdeInfo", "화요일", "2026-02-30", 1);
        var tour = new OutingResponse.Evidence("restdateculture", "월요일(공휴일이면 다음 평일)", "TOUR", "관광자료",
                missing.url(), null, missing.collectedAt(), missing.checkedAt(), false, UUID.randomUUID());
        var values = List.of(missing, invalid, tour);
        assertThat(OutingInformation.latestStandardRows(values)).containsExactly(missing, invalid, tour);
        assertThat(OutingInformation.preferStandard(values)).containsExactly(missing, invalid, tour);
    }

    @Test @DisplayName("같은 시간은 한 번만 제공하고 평일·휴일과 시작·종료의 의미를 보존한다")
    void keepsTimeRoles() {
        var start = entry("weekdayOperOpenHhmm", "09:30", "2025-12-10", 0);
        var recent = entry("weekdayOperOpenHhmm", "09:30", "2026-06-24", 1);
        var end = entry("weekdayOperColseHhmm", "09:30", "2026-06-24", 1);
        var holiday = entry("holidayOperOpenHhmm", "09:30", "2026-06-24", 1);
        assertThat(OutingInformation.compact("hours", List.of(start, recent, end, holiday)))
                .containsExactly(recent, end, holiday);
    }

    @Test @DisplayName("도로명·지번과 같은 기본 주소만 생략하고 다른 번지·상세 주소는 보존한다")
    void removesRepeatedAddressOnly() {
        var basic = entry("addr1", "대구광역시 도로 66", "", 0);
        var road = entry("rdnmadr", "대구광역시  도로 66", "", 0);
        var lot = entry("lnmadr", "대구광역시 상리 971", "", 0);
        var extra = entry("addr2", "2층", "", 0);
        assertThat(OutingInformation.compact("address", List.of(basic, road, lot, extra))).containsExactly(road, lot, extra);
        var different = entry("addr1", "대구광역시 도로 67", "", 0);
        assertThat(OutingInformation.compact("address", List.of(different, road))).containsExactly(different, road);
    }

    @Test @DisplayName("동일 값 통합 단계에서 서로 다른 요금·공휴일 예외와 반복 안내의 제목 연결을 유지한다")
    void preservesConflictingValuesAndNoteRows() {
        var paid = entry("adultChrge", "3000", "2025-12-10", 0);
        var free = entry("adultChrge", "0", "2026-06-24", 0);
        assertThat(OutingInformation.compact("generalFee", List.of(paid, free))).containsExactly(paid, free);
        var closed = entry("rstdeInfo", "월요일", "", 0);
        var exception = entry("rstdeInfo", "월요일(공휴일이면 다음 평일)", "", 0);
        assertThat(OutingInformation.compact("closedDays", List.of(closed, exception))).containsExactly(closed, exception);
        var first = entry("infoname", "프로그램", "", 0);
        var second = entry("infoname", "프로그램", "", 0);
        assertThat(OutingInformation.compact("notes", List.of(first, second))).containsExactly(first, second);
    }

    @Test @DisplayName("교차 필드의 같은 연락처는 통합하고 다른 전화번호·내선은 유지한다")
    void compactsContactAcrossFields() {
        var phone = entry("tel", "053-659-4900", "", 0);
        var repeated = entry("phoneNumber", "053-659-4900", "", 1);
        var different = entry("operPhoneNumber", "053-668-2796", "", 0);
        var extension = entry("tel", "053-659-4900 (내선 1)", "", 0);
        assertThat(OutingInformation.compact("contact", List.of(phone, repeated, different, extension)))
                .containsExactly(repeated, different, extension);
    }

    private OutingResponse.Evidence entry(String field, String value, String reference, int seconds) {
        var time = Instant.parse("2026-10-03T09:00:00Z").plusSeconds(seconds);
        return new OutingResponse.Evidence(field, value, "MUSEUM", "시설", "https://example.org",
                reference, time, time, false, UUID.randomUUID());
    }
}
