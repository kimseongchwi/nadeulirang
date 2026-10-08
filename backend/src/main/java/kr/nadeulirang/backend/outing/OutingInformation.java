package kr.nadeulirang.backend.outing;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class OutingInformation {
    private OutingInformation() { }

    static List<OutingResponse.Evidence> latestStandardRows(List<OutingResponse.Evidence> values) {
        Map<String, LocalDate> latest = new LinkedHashMap<>();
        for (var value : values) {
            var date = referenceDate(value);
            if (standard(value) && date != null) latest.merge(sourceKey(value), date,
                    (previous, next) -> next.isAfter(previous) ? next : previous);
        }
        // 행 전체를 먼저 선택해 최신 행의 빈 값을 과거 행의 값으로 채우지 않는다.
        return values.stream().filter(value -> !standard(value) || !latest.containsKey(sourceKey(value))
                || latest.get(sourceKey(value)).equals(referenceDate(value))).toList();
    }

    static List<OutingResponse.Evidence> preferStandard(List<OutingResponse.Evidence> values) {
        var preferred = values.stream().filter(value -> standard(value) && referenceDate(value) != null).toList();
        return preferred.isEmpty() ? values : preferred;
    }

    private static boolean standard(OutingResponse.Evidence value) {
        return value.source().equals("MUSEUM") || value.source().equals("FESTIVAL");
    }

    private static String sourceKey(OutingResponse.Evidence value) {
        return value.source() + ":" + value.sourceKey();
    }

    private static LocalDate referenceDate(OutingResponse.Evidence value) {
        if (value.sourceReference() == null || !value.sourceReference().matches("\\d{4}-\\d{2}-\\d{2}")) return null;
        try { return LocalDate.parse(value.sourceReference()); }
        catch (DateTimeParseException ignored) { return null; }
    }

    static List<OutingResponse.Evidence> compact(String group, List<OutingResponse.Evidence> values) {
        // 반복 안내의 제목/본문은 observationId로 연결하므로 행 단위를 유지한다.
        if (group.equals("notes")) return values;
        Map<String, OutingResponse.Evidence> unique = new LinkedHashMap<>();
        for (var value : values) {
            String comparable = comparable(value.value());
            if (group.equals("address") && value.field().equals("addr1") && values.stream().anyMatch(other ->
                    List.of("rdnmadr", "lnmadr").contains(other.field()) && comparable(other.value()).equals(comparable))) continue;
            // 연락처는 같은 번호의 교차 필드 반복도 줄이되 다른 번호·내선은 그대로 보존한다.
            String field = switch (group) {
                case "contact", "closedDays", "officialWebsite", "reservation", "discount" -> group;
                case "generalFee" -> value.field().equals("admissionAdult") ? "adultChrge" : value.field();
                default -> value.field();
            };
            String key = field + ":" + comparable;
            unique.merge(key, value, (previous, next) -> next.checkedAt().isAfter(previous.checkedAt()) ? next : previous);
        }
        return List.copyOf(unique.values());
    }

    private static String comparable(String value) {
        // 괄호·숫자·조건 문구는 지우지 않아 실제로 다른 안내를 같은 값으로 만들지 않는다.
        return value.replaceAll("(?U)\\s+", "");
    }
}
