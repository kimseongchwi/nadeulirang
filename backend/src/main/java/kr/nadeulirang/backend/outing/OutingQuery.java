package kr.nadeulirang.backend.outing;

import java.util.Set;

public record OutingQuery(String keyword, String region, String kind, String period, String sort, int page, int days) {
    private static final Set<String> KINDS = Set.of("FESTIVAL", "EVENT", "EXHIBITION", "MUSEUM", "CULTURAL_SITE");
    private static final Set<String> PERIODS = Set.of("ALL", "ONGOING", "UPCOMING", "PERMANENT", "UNKNOWN");
    private static final Set<String> SORTS = Set.of("DEFAULT", "NAME", "START_DATE", "END_DATE");

    public OutingQuery(String keyword, String region, String kind, String period, String sort, int page) {
        this(keyword, region, kind, period, sort, page, 0);
    }

    public OutingQuery {
        keyword = keyword.strip();
        region = region.strip();
        kind = kind.strip();
        if (keyword.length() > 200 || region.length() > 20 || !kind.isEmpty() && !KINDS.contains(kind)
                || !PERIODS.contains(period) || !SORTS.contains(sort) || page < 1
                || days != 0 && (!Set.of(7, 14, 30).contains(days) || !period.equals("UPCOMING"))) {
            throw new IllegalArgumentException("검색 조건을 확인하세요.");
        }
    }

    public long offset() { return ((long) page - 1) * 20; }

    public String orderBy() {
        return switch (sort) {
            case "NAME" -> "name COLLATE \"C\", id";
            case "START_DATE" -> "event_start NULLS LAST, name COLLATE \"C\", id";
            case "END_DATE" -> "event_end NULLS LAST, name COLLATE \"C\", id";
            default -> "CASE period WHEN 'ONGOING' THEN 0 WHEN 'UPCOMING' THEN 0 WHEN 'PERMANENT' THEN 1 ELSE 2 END, "
                    + "CASE WHEN period IN ('ONGOING', 'UPCOMING') THEN event_start END, name COLLATE \"C\", id";
        };
    }
}
