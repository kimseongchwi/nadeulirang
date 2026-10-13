package kr.nadeulirang.backend.outing;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OutingInformationTests {
    @Test
    @DisplayName("유효 표준 기준일을 우선하며 잘못된 기준일은 관광 보완을 막지 않는다")
    void prefersValidStandardAndKeepsFallback() {
        var standard = entry("adultChrge", "3000", "2026-06-24", 0);
        var invalid = entry("adultChrge", "1000", "2026-02-30", 1);
        var tour =
                new OutingResponse.Evidence(
                        "usefee",
                        "5000",
                        "TOUR",
                        "관광자료",
                        standard.url(),
                        null,
                        standard.collectedAt(),
                        standard.checkedAt(),
                        false,
                        UUID.randomUUID());
        assertThat(OutingInformation.preferStandard(List.of(standard, tour)))
                .containsExactly(standard);
        assertThat(OutingInformation.preferStandard(List.of(invalid, tour)))
                .containsExactly(invalid, tour);
    }

    @Test
    @DisplayName("같은 시간은 한 번만 제공하고 평일·휴일과 시작·종료의 의미를 보존한다")
    void keepsTimeRoles() {
        var start = entry("weekdayOperOpenHhmm", "09:30", "2025-12-10", 0);
        var recent = entry("weekdayOperOpenHhmm", "09:30", "2026-06-24", 1);
        var end = entry("weekdayOperColseHhmm", "09:30", "2026-06-24", 1);
        var holiday = entry("holidayOperOpenHhmm", "09:30", "2026-06-24", 1);
        assertThat(OutingInformation.compact("hours", List.of(start, recent, end, holiday)))
                .containsExactly(recent, end, holiday);
    }

    @Test
    @DisplayName("도로명·지번과 같은 기본 주소만 생략하고 다른 번지·상세 주소는 보존한다")
    void removesRepeatedAddressOnly() {
        var basic = entry("addr1", "대구광역시 도로 66", "", 0);
        var road = entry("rdnmadr", "대구광역시  도로 66", "", 0);
        var lot = entry("lnmadr", "대구광역시 상리 971", "", 0);
        var extra = entry("addr2", "2층", "", 0);
        assertThat(OutingInformation.compact("address", List.of(basic, road, lot, extra)))
                .containsExactly(road, lot, extra);
        var different = entry("addr1", "대구광역시 도로 67", "", 0);
        assertThat(OutingInformation.compact("address", List.of(different, road)))
                .containsExactly(different, road);
    }

    @Test
    @DisplayName("동일 값 통합 단계에서 서로 다른 요금·공휴일 예외와 반복 안내의 제목 연결을 유지한다")
    void preservesConflictingValuesAndNoteRows() {
        var paid = entry("adultChrge", "3000", "2025-12-10", 0);
        var free = entry("adultChrge", "0", "2026-06-24", 0);
        assertThat(OutingInformation.compact("generalFee", List.of(paid, free)))
                .containsExactly(paid, free);
        var closed = entry("rstdeInfo", "월요일", "", 0);
        var exception = entry("rstdeInfo", "월요일(공휴일이면 다음 평일)", "", 0);
        assertThat(OutingInformation.compact("closedDays", List.of(closed, exception)))
                .containsExactly(closed, exception);
        var first = entry("infoname", "프로그램", "", 0);
        var second = entry("infoname", "프로그램", "", 0);
        assertThat(OutingInformation.compact("notes", List.of(first, second)))
                .containsExactly(first, second);
    }

    @Test
    @DisplayName("교차 필드의 같은 연락처는 통합하고 다른 전화번호·내선은 유지한다")
    void compactsContactAcrossFields() {
        var phone = entry("tel", "053-659-4900", "", 0);
        var repeated = entry("phoneNumber", "053-659-4900", "", 1);
        var different = entry("operPhoneNumber", "053-668-2796", "", 0);
        var extension = entry("tel", "053-659-4900 (내선 1)", "", 0);
        assertThat(
                        OutingInformation.compact(
                                "contact", List.of(phone, repeated, different, extension)))
                .containsExactly(repeated, different, extension);
    }

    private OutingResponse.Evidence entry(
            String field, String value, String reference, int seconds) {
        var time = Instant.parse("2026-10-03T09:00:00Z").plusSeconds(seconds);
        return new OutingResponse.Evidence(
                field,
                value,
                "MUSEUM",
                "시설",
                "https://example.org",
                reference,
                time,
                time,
                false,
                UUID.randomUUID());
    }
}
