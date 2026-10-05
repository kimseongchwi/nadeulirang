package kr.nadeulirang.backend.collection;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;

@Repository
public class CollectionStore {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public CollectionStore(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(manager);
    }

    public UUID reserve(Source source, String operation, JsonNode query, Instant now) {
        return transactions.execute(status -> {
            var state = jdbc.queryForMap("SELECT blocked_reason, last_started_at FROM collection_source WHERE name = ? FOR UPDATE", source.name());
            if (state.get("blocked_reason") != null) throw new IllegalStateException("원천 중단 상태: " + source.name());
            Timestamp last = (Timestamp) state.get("last_started_at");
            if (last != null && last.toInstant().isAfter(now.minusSeconds(1))) {
                throw new IllegalStateException("원천 요청 시작 간격 1초를 확보하세요.");
            }
            Integer count = jdbc.queryForObject("SELECT count(*) FROM source_call WHERE source = ? AND started_at > ?",
                    Integer.class, source.name(), Timestamp.from(now.minusSeconds(86400)));
            if (count >= source.dailyBudget) throw new IllegalStateException("24시간 원천 호출 예산을 소진했습니다.");
            UUID id = UUID.randomUUID();
            jdbc.update("INSERT INTO source_call(id, source, operation, query, started_at, outcome) VALUES (?, ?, ?, ?::jsonb, ?, 'STARTED')",
                    id, source.name(), operation, query.toString(), Timestamp.from(now));
            jdbc.update("UPDATE collection_source SET last_started_at = ? WHERE name = ?", Timestamp.from(now), source.name());
            return id;
        });
    }

    public void finish(UUID call, Source source, SourceResponse reply, Instant now) {
        transactions.executeWithoutResult(status -> {
            jdbc.update("UPDATE source_call SET finished_at = ?, outcome = ?, result_code = ?, payload = ?::jsonb WHERE id = ?",
                    Timestamp.from(now), reply.outcome(), reply.code(), reply.payload() == null ? null : reply.payload().toString(), call);
            String block = CollectionPolicy.blockingCode(reply.code());
            if (block != null) jdbc.update("UPDATE collection_source SET blocked_reason = ? WHERE name = ?", block, source.name());
        });
    }

    public void failedRecord(Source source, String key, String operation, String code, Instant now) {
        transactions.executeWithoutResult(status -> {
            jdbc.update("UPDATE source_record SET last_failure_at = ?, last_failure_code = ? WHERE source = ? AND source_key = ?",
                Timestamp.from(now), code, source.name(), key);
            jdbc.update("""
                INSERT INTO record_operation(record_id, operation, last_failure_at, failure_code)
                SELECT id, ?, ?, ? FROM source_record WHERE source = ? AND source_key = ?
                ON CONFLICT(record_id, operation) DO UPDATE SET last_failure_at = EXCLUDED.last_failure_at, failure_code = EXCLUDED.failure_code
                """, operation, Timestamp.from(now), code, source.name(), key);
        });
    }

    public void ingest(Source source, UUID call, JsonNode row, String operation, String reviewKey,
                       String reviewedKind, String regionCode, String regionName, String reviewReason, Instant now) {
        transactions.executeWithoutResult(status -> {
            String name = text(row, source == Source.TOUR ? "title" : source == Source.FESTIVAL ? "fstvlNm" : "fcltyNm");
            String identity = identity(source, row);
            String key = source == Source.TOUR ? text(row, "contentid") : CollectionPolicy.hash(identity);
            if (key.isBlank()) throw new IllegalArgumentException("원천 식별자가 필요합니다.");
            // 공통·소개 응답에 이름이 없을 때도 같은 원천 식별자를 사용하며 기존 정보를 유지한다.
            UUID outing = jdbc.query("SELECT outing_id FROM source_record WHERE source = ? AND source_key = ?",
                    (rs, n) -> rs.getObject(1, UUID.class), source.name(), key).stream().findFirst().orElse(null);
            if (outing == null) {
                if (name.isBlank()) throw new IllegalArgumentException("새 원천 항목에는 이름이 필요합니다.");
                String canonicalKey = reviewKey == null ? source.name() + ":" + key : reviewKey;
                jdbc.update("INSERT INTO outing(id, review_key, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(review_key) DO NOTHING",
                        UUID.randomUUID(), canonicalKey, name, Timestamp.from(now));
                outing = jdbc.queryForObject("SELECT id FROM outing WHERE review_key = ?", UUID.class, canonicalKey);
            }
            if (!name.isBlank()) jdbc.update("UPDATE outing SET name = ? WHERE id = ?", name, outing);
            if (source == Source.TOUR && operation.equals("detailCommon2") && reviewReason == null) {
                jdbc.update("UPDATE outing SET review_status = 'PENDING', review_reason = '이름·종류·지역 재검토 필요' WHERE id = ?", outing);
            }
            UUID record = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO source_record(id, source, source_key, identity_candidate, outing_id, source_url, license, last_success_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source, source_key) DO UPDATE
                    SET last_success_at = EXCLUDED.last_success_at, last_failure_at = NULL, last_failure_code = NULL
                    """, record, source.name(), key, identity, outing, source.datasetUrl, source.license, Timestamp.from(now));
            record = jdbc.queryForObject("SELECT id FROM source_record WHERE source = ? AND source_key = ?", UUID.class, source.name(), key);
            jdbc.update("""
                    INSERT INTO record_operation(record_id, operation, last_success_at, last_success_call) VALUES (?, ?, ?, ?)
                    ON CONFLICT(record_id, operation) DO UPDATE SET last_success_at = EXCLUDED.last_success_at,
                    last_success_call = EXCLUDED.last_success_call, last_failure_at = NULL, failure_code = NULL
                    """, record, operation, Timestamp.from(now), call);
            // 다른 상세 항목의 실패는 한 항목의 성공만으로 지우지 않는다.
            jdbc.update("""
                    UPDATE source_record SET last_failure_at = (SELECT max(last_failure_at) FROM record_operation WHERE record_id = ?),
                    last_failure_code = (SELECT failure_code FROM record_operation WHERE record_id = ? AND last_failure_at IS NOT NULL ORDER BY last_failure_at DESC LIMIT 1)
                    WHERE id = ?
                    """, record, record, record);
            if (jdbc.queryForObject("SELECT count(*) FROM source_link_history WHERE record_id = ?", Integer.class, record) == 0) {
                jdbc.update("INSERT INTO source_link_history(id, record_id, to_outing_id, linked_at, reason) VALUES (?, ?, ?, ?, ?)",
                        UUID.randomUUID(), record, outing, Timestamp.from(now), reviewReason == null ? "원천 식별자로 최초 연결, 교차 원천 통합 미검토" : reviewReason);
            }
            UUID observation = UUID.randomUUID();
            String reference = text(row, source == Source.TOUR ? "modifiedtime" : "referenceDate");
            jdbc.update("""
                    INSERT INTO source_observation(id, record_id, call_id, row_hash, raw_row, source_reference, collected_at)
                    VALUES (?, ?, ?, ?, ?::jsonb, ?, ?) ON CONFLICT(record_id, call_id, row_hash) DO NOTHING
                    """, observation, record, call, CollectionPolicy.hash(row.toString()), row.toString(), reference, Timestamp.from(now));
            observation = jdbc.queryForObject("SELECT id FROM source_observation WHERE record_id = ? AND call_id = ? AND row_hash = ?",
                    UUID.class, record, call, CollectionPolicy.hash(row.toString()));
            if (jdbc.queryForObject("SELECT count(*) FROM field_evidence WHERE observation_id = ?", Integer.class, observation) == 0) {
                for (var property : row.properties()) {
                    jdbc.update("""
                            INSERT INTO field_evidence(id, observation_id, field_name, value, source_url, source_reference, checked_at)
                            VALUES (?, ?, ?, ?::jsonb, ?, ?, ?)
                            """, UUID.randomUUID(), observation, property.getKey(), property.getValue().toString(), source.datasetUrl, reference, Timestamp.from(now));
                }
            }
            if (source == Source.TOUR && operation.equals("detailCommon2")) {
                // 성공한 공통 응답의 대표 사진만 활성화한다. 실패한 조회는 기존 사진을 지우지 않는다.
                jdbc.update("UPDATE file_asset SET active = false WHERE record_id = ? AND active", record);
                String photo = PhotoPolicy.url(text(row, "firstimage"));
                if (text(row, "cpyrhtDivCd").equals("Type1") && photo != null) {
                    jdbc.update("""
                        INSERT INTO file_asset(id, record_id, observation_id, original_url, thumbnail_url,
                            provider, attribution_url, license_code, checked_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'KOGL1', ?)
                        ON CONFLICT(record_id, original_url) DO UPDATE SET observation_id=EXCLUDED.observation_id,
                            thumbnail_url=EXCLUDED.thumbnail_url, checked_at=EXCLUDED.checked_at, active=true
                        """, UUID.randomUUID(), record, observation, photo, PhotoPolicy.url(text(row, "firstimage2")),
                        "한국관광공사 TourAPI", source.datasetUrl, Timestamp.from(now));
                }
            }
            if (reviewedKind != null && regionCode != null && regionName != null && reviewReason != null) {
                jdbc.update("""
                        UPDATE outing SET kind = ?, region_code = ?, region_name = ?, review_status = 'APPROVED',
                        review_reason = ?, reviewed_at = ?, visibility = CASE WHEN visibility = 'HIDDEN' THEN visibility ELSE 'VISIBLE' END WHERE id = ?
                        """, reviewedKind, regionCode, regionName, reviewReason, Timestamp.from(now), outing);
            }
            String flag = text(row, "showflag");
            if (flag.equals("0") || flag.equals("1")) {
                jdbc.update("UPDATE outing SET visibility = ? WHERE id = ?", flag.equals("0") ? "HIDDEN" : "VISIBLE", outing);
            }
            String start = text(row, source == Source.TOUR ? "eventstartdate" : "fstvlStartDate");
            String end = text(row, source == Source.TOUR ? "eventenddate" : "fstvlEndDate");
            var startDate = CollectionPolicy.date(start);
            var endDate = CollectionPolicy.date(end);
            if (startDate != null && endDate != null && !startDate.isAfter(endDate)) {
                jdbc.update("UPDATE outing SET event_start = ?, event_end = ?, lifecycle = CASE WHEN lifecycle = 'CANCELLED' THEN lifecycle ELSE ? END WHERE id = ?",
                        startDate, endDate, CollectionPolicy.lifecycle(startDate, endDate, false, now), outing);
            } else if (source == Source.FESTIVAL || source == Source.TOUR && operation.equals("detailIntro2")) {
                jdbc.update("""
                        UPDATE outing SET event_start = NULL, event_end = NULL, operation_verified = false,
                        lifecycle = CASE WHEN lifecycle = 'CANCELLED' THEN lifecycle ELSE 'UNKNOWN' END
                        WHERE id = ? AND kind IN ('FESTIVAL', 'EVENT', 'EXHIBITION')
                        """, outing);
            }
            jdbc.update("""
                    UPDATE outing SET lifecycle = CASE WHEN lifecycle = 'CANCELLED' THEN lifecycle
                    WHEN event_end < ? THEN 'ENDED' ELSE 'ACTIVE' END WHERE id = ? AND event_start IS NOT NULL AND event_end IS NOT NULL
                    """, now.atZone(CollectionPolicy.SEOUL).toLocalDate(), outing);
            recalculateFee(outing);
        });
    }

    private void recalculateFee(UUID outing) {
        // 각 원천·필드의 마지막 값만 비교한다. 과거 요금은 이력에서 지우지 않는다.
        var fees = jdbc.query("""
                SELECT DISTINCT f.field_name, f.value #>> '{}' AS value
                FROM source_record r JOIN source_observation b ON b.record_id = r.id
                JOIN field_evidence f ON f.observation_id = b.id
                JOIN record_operation op ON op.record_id = r.id AND op.last_success_call = b.call_id
                WHERE r.outing_id = ? AND f.field_name IN ('adultChrge', 'usefee', 'usetimefestival', 'admissionAdult')
                """, (rs, n) -> new FeeValue(rs.getString(1), rs.getString(2)), outing);
        var amounts = fees.stream().map(f -> CollectionPolicy.numericFee(f.value())).filter(java.util.Objects::nonNull).distinct().toList();
        boolean unknown = fees.isEmpty() || fees.stream().anyMatch(f -> CollectionPolicy.numericFee(f.value()) == null);
        boolean conflict = amounts.size() > 1 || fees.stream().map(FeeValue::value).filter(v -> v != null && !v.isBlank())
                .map(v -> CollectionPolicy.numericFee(v) == null ? v : CollectionPolicy.numericFee(v).toPlainString()).distinct().count() > 1;
        var amount = !unknown && !conflict && amounts.size() == 1 ? amounts.getFirst() : null;
        jdbc.update("UPDATE outing SET adult_fee = ?, fee_status = ?, fee_conflict = ? WHERE id = ?", amount,
                amount == null ? "UNKNOWN" : amount.signum() == 0 ? "FREE" : "PAID", conflict, outing);
    }

    public static String identity(Source source, JsonNode row) {
        if (source == Source.TOUR) return text(row, "contentid");
        String name = text(row, source == Source.FESTIVAL ? "fstvlNm" : "fcltyNm");
        String address = text(row, "rdnmadr");
        if (address.isBlank()) address = text(row, "lnmadr");
        // 주소·기관 누락 시 서로 다른 원문을 합치지 않는다.
        String institution = text(row, source == Source.FESTIVAL ? "mnnstNm" : "operInstitutionNm");
        if (address.isBlank() || institution.isBlank()) return "unresolved:" + CollectionPolicy.hash(row.toString());
        String occurrence = source == Source.FESTIVAL ? ":" + text(row, "fstvlStartDate") + ":" + text(row, "fstvlEndDate") + ":" + text(row, "opar") : "";
        return CollectionPolicy.normalize(name) + ":" + CollectionPolicy.normalize(address) + ":" + CollectionPolicy.normalize(institution) + occurrence;
    }

    public String summary() {
        return jdbc.queryForList("SELECT region_name, kind, count(*) AS count FROM public_candidate GROUP BY region_name, kind ORDER BY region_name, kind").toString();
    }

    public record TourReview(String name, String kind, String regionCode) { }

    public TourReview reviewedTour(String sourceKey) {
        return jdbc.query("""
                SELECT o.name,o.kind,o.region_code FROM source_record r JOIN outing o ON o.id=r.outing_id
                WHERE r.source='TOUR' AND r.source_key=? AND o.review_status='APPROVED'
                """, (rs,n) -> new TourReview(rs.getString(1),rs.getString(2),rs.getString(3)),sourceKey)
                .stream().findFirst().orElse(null);
    }

    public boolean blocked(Source source) {
        return jdbc.queryForObject("SELECT blocked_reason IS NOT NULL FROM collection_source WHERE name = ?", Boolean.class, source.name());
    }

    public boolean matchesReviewedTarget(String target, JsonNode row) {
        var addresses = jdbc.query("""
                SELECT b.raw_row->>'addr1' FROM outing o JOIN source_record r ON r.outing_id = o.id
                JOIN source_observation b ON b.record_id = r.id JOIN source_call c ON c.id = b.call_id
                WHERE o.review_key = ? AND r.source = 'TOUR' AND c.operation = 'detailCommon2'
                AND o.review_status = 'APPROVED' ORDER BY b.collected_at DESC LIMIT 1
                """, (rs, n) -> rs.getString(1), target);
        if (addresses.isEmpty() || addresses.getFirst() == null) return false;
        String address = CollectionPolicy.normalize(text(row, "rdnmadr"));
        if (address.equals(CollectionPolicy.normalize(addresses.getFirst()))) return true;
        // P06에서 기관 소개로 대조한 클레이아크의 21/25번지 차이만 예외로 보존한다.
        return target.equals("TOUR:130841") && address.startsWith("경상남도김해시") && address.contains("분청로21")
                && CollectionPolicy.normalize(addresses.getFirst()).contains("분청로25");
    }

    public boolean needsDetails(String sourceKey, String currentReference, boolean event, Instant now) {
        var references = jdbc.query("""
                SELECT b.source_reference FROM source_record r JOIN source_observation b ON b.record_id = r.id
                JOIN source_call c ON c.id = b.call_id WHERE r.source = 'TOUR' AND r.source_key = ? AND c.operation = 'detailCommon2'
                ORDER BY b.collected_at DESC LIMIT 1
                """, (rs, n) -> rs.getString(1), sourceKey);
        boolean changed = references.isEmpty() || !java.util.Objects.equals(references.getFirst(), currentReference);
        for (String operation : java.util.List.of("detailIntro2", "detailInfo2")) {
            var rows = jdbc.query("""
                    SELECT o.last_success_at, o.last_failure_at FROM record_operation o JOIN source_record r ON r.id = o.record_id
                    WHERE r.source = 'TOUR' AND r.source_key = ? AND o.operation = ?
                    """, (rs, n) -> new OperationState(rs.getTimestamp(1), rs.getTimestamp(2)), sourceKey, operation);
            if (rows.isEmpty() || rows.getFirst().failure() != null || CollectionPolicy.detailDue(event, changed,
                    rows.getFirst().success() == null ? null : rows.getFirst().success().toInstant(), now)) return true;
        }
        return false;
    }

    public void emptyOperation(Source source, String key, String operation, Instant now) {
        transactions.executeWithoutResult(status -> {
            jdbc.update("""
                INSERT INTO record_operation(record_id, operation, last_success_at)
                SELECT id, ?, ? FROM source_record WHERE source = ? AND source_key = ?
                ON CONFLICT(record_id, operation) DO UPDATE SET last_success_at = EXCLUDED.last_success_at,
                last_success_call = NULL, last_failure_at = NULL, failure_code = NULL
                """, operation, Timestamp.from(now), source.name(), key);
            jdbc.update("""
                    UPDATE source_record r SET last_failure_at = (SELECT max(last_failure_at) FROM record_operation WHERE record_id = r.id),
                    last_failure_code = (SELECT failure_code FROM record_operation WHERE record_id = r.id AND last_failure_at IS NOT NULL ORDER BY last_failure_at DESC LIMIT 1)
                    WHERE source = ? AND source_key = ?
                    """, source.name(), key);
            var outings = jdbc.query("SELECT outing_id FROM source_record WHERE source = ? AND source_key = ?",
                (rs, n) -> rs.getObject(1, UUID.class), source.name(), key);
            if (source == Source.TOUR && operation.equals("detailIntro2")) {
                jdbc.update("""
                        UPDATE outing SET event_start = NULL, event_end = NULL, operation_verified = false,
                        lifecycle = CASE WHEN lifecycle = 'CANCELLED' THEN lifecycle ELSE 'UNKNOWN' END
                        WHERE id IN (SELECT outing_id FROM source_record WHERE source = ? AND source_key = ?)
                        AND kind IN ('FESTIVAL', 'EVENT', 'EXHIBITION')
                        """, source.name(), key);
            }
            outings.forEach(this::recalculateFee);
        });
    }

    public void applySyncFlag(JsonNode row) {
        String flag = text(row, "showflag");
        if (!java.util.Set.of("0", "1").contains(flag)) return;
        jdbc.update("UPDATE outing SET visibility = ? WHERE id IN (SELECT outing_id FROM source_record WHERE source = 'TOUR' AND source_key = ?)",
                flag.equals("0") ? "HIDDEN" : "VISIBLE", text(row, "contentid"));
    }

    public void relink(Source source, String sourceKey, String targetKey, String reason, Instant now) {
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("기관·주소·회차를 대조한 연결 근거가 필요합니다.");
        transactions.executeWithoutResult(status -> {
            var record = jdbc.queryForMap("SELECT id, outing_id FROM source_record WHERE source = ? AND source_key = ? FOR UPDATE", source.name(), sourceKey);
            UUID target = jdbc.queryForObject("SELECT id FROM outing WHERE review_key = ?", UUID.class, targetKey);
            UUID previous = (UUID) record.get("outing_id");
            if (previous.equals(target)) return;
            jdbc.update("UPDATE source_record SET outing_id = ? WHERE id = ?", target, record.get("id"));
            jdbc.update("INSERT INTO source_link_history(id, record_id, from_outing_id, to_outing_id, linked_at, reason) VALUES (?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), record.get("id"), previous, target, Timestamp.from(now), reason);
            recalculateFee(previous);
            recalculateFee(target);
        });
    }

    public void reviewLifecycle(String key, String lifecycle, String officialUrl, String reason, Instant now) {
        if (!java.util.Set.of("CANCELLED", "ACTIVE").contains(lifecycle) || CollectionPolicy.safeLink(officialUrl) == null || reason.isBlank()) {
            throw new IllegalArgumentException("상태·공식 공지 링크·검토 근거가 필요합니다.");
        }
        transactions.executeWithoutResult(status -> {
            UUID outing = jdbc.queryForObject("SELECT id FROM outing WHERE review_key = ?", UUID.class, key);
            jdbc.update("INSERT INTO outing_review(id, outing_id, field_name, value, source_url, checked_at, reviewed_at, review_due_at, reason) VALUES (?, ?, 'lifecycle', ?::jsonb, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), outing, "\"" + lifecycle + "\"", officialUrl, Timestamp.from(now), Timestamp.from(now), Timestamp.from(now.plusSeconds(86400)), reason);
            jdbc.update("UPDATE outing SET lifecycle = ? WHERE id = ?", lifecycle, outing);
        });
    }

    public static String text(JsonNode row, String field) { return row.path(field).asText("").strip(); }
    private record FeeValue(String field, String value) { }
    private record OperationState(Timestamp success, Timestamp failure) { }
}
