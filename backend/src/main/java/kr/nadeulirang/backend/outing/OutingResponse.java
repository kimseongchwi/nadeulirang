package kr.nadeulirang.backend.outing;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class OutingResponse {
    private OutingResponse() { }

    public record Summary(UUID id, String name, String kind, String regionCode, String regionName,
                          String period, LocalDate eventStart, LocalDate eventEnd, String feeStatus,
                          BigDecimal adultFee, boolean feeConflict, boolean operationVerified,
                          Instant collectedAt, Instant sourceCheckedAt) { }

    public record Page(List<Summary> items, int page, int pageSize, long total, LocalDate asOfDate) { }

    public record Source(String source, String sourceKey, String url, String license,
                         Instant collectedAt, Instant checkedAt, Instant lastFailureAt,
                         String lastFailureCode, boolean stale) { }

    public record Evidence(String field, String value, String source, String sourceKey, String url,
                           String sourceReference, Instant collectedAt, Instant checkedAt, boolean stale,
                           UUID observationId) { }

    public record Link(String purpose, String url, Evidence evidence) { }

    public record Detail(Summary item, List<Source> sources, Map<String, List<Evidence>> information,
                         List<Link> links, List<String> unconfirmed, LocalDate asOfDate) { }

    public record Region(String code, String name, long count) { }
    public record Kind(String code, long count) { }
    public record Options(List<Region> regions, List<Kind> kinds, long total, LocalDate asOfDate) { }
}
