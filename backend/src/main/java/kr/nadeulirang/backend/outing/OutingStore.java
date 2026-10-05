package kr.nadeulirang.backend.outing;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.nadeulirang.backend.collection.CollectionPolicy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class OutingStore {
    // 상세에서는 취소도 공개 가능하다. 검토·표출·이용허락·원문 확보 조건은 모든 조회에 적용한다.
    private static final String CANDIDATES = """
        WITH candidates AS (
            SELECT o.*, a.id AS photo_id, a.original_url AS photo_url, a.thumbnail_url AS photo_thumbnail,
                a.provider AS photo_provider, a.attribution_url AS photo_attribution,
                a.license_code AS photo_license, a.checked_at AS photo_checked_at,
                CASE WHEN lifecycle = 'CANCELLED' THEN 'CANCELLED'
                     WHEN lifecycle = 'ENDED' THEN 'ENDED'
                     WHEN kind IN ('MUSEUM', 'CULTURAL_SITE') THEN 'PERMANENT'
                     WHEN event_start IS NULL OR event_end IS NULL THEN 'UNKNOWN'
                     WHEN event_end < ?::date THEN 'ENDED'
                     WHEN event_start > ?::date THEN 'UPCOMING' ELSE 'ONGOING' END AS period,
                (SELECT max(b.collected_at) FROM source_record r JOIN source_observation b ON b.record_id = r.id
                    WHERE r.outing_id = o.id AND r.license IN ('KOGL1_DATA', 'TOUR_DATA')) AS collected_at,
                (SELECT max(r.last_success_at) FROM source_record r WHERE r.outing_id = o.id
                    AND r.license IN ('KOGL1_DATA', 'TOUR_DATA')) AS source_checked_at
            FROM outing o LEFT JOIN LATERAL (
                SELECT a.* FROM file_asset a JOIN source_record r ON r.id=a.record_id
                JOIN record_operation op ON op.record_id=r.id AND op.operation='detailCommon2'
                JOIN source_observation b ON b.id=a.observation_id AND b.call_id=op.last_success_call
                WHERE r.outing_id=o.id AND r.source='TOUR' AND r.license='TOUR_DATA'
                    AND a.active AND a.license_code='KOGL1' AND b.raw_row->>'cpyrhtDivCd'='Type1'
                ORDER BY a.checked_at DESC, a.id LIMIT 1
            ) a ON true
            WHERE review_status = 'APPROVED' AND visibility = 'VISIBLE'
                AND name <> '' AND kind IS NOT NULL AND region_code IS NOT NULL AND region_name IS NOT NULL
                AND EXISTS (SELECT 1 FROM source_record r JOIN source_observation b ON b.record_id = r.id
                    WHERE r.outing_id = o.id AND r.license IN ('KOGL1_DATA', 'TOUR_DATA'))
        )
        """;
    private static final Map<String, List<String>> FIELDS = Map.ofEntries(
        Map.entry("address", List.of("addr1", "addr2", "rdnmadr", "lnmadr", "eventplace", "opar")),
        Map.entry("description", List.of("overview", "fcltyIntrcn", "fcltyType", "fstvlCo")),
        Map.entry("hours", List.of("usetime", "usetimeculture", "playtime", "weekdayOperOpenHhmm", "weekdayOperColseHhmm", "holidayOperOpenHhmm", "holidayCloseOpenHhmm")),
        Map.entry("closedDays", List.of("restdate", "restdateculture", "rstdeInfo")),
        Map.entry("generalFee", List.of("usefee", "usetimefestival", "adultChrge", "yngbgsChrge", "childChrge", "admissionAdult")),
        Map.entry("extraFee", List.of("etcChrgeInfo", "parkingfee")),
        Map.entry("discount", List.of("discountinfo", "discountinfofestival")),
        Map.entry("reservation", List.of("bookingplace")),
        Map.entry("officialWebsite", List.of("homepage", "homepageUrl", "eventhomepage")),
        Map.entry("contact", List.of("tel", "infocenter", "infocenterculture", "phoneNumber", "operPhoneNumber")),
        // 반복 안내는 주차·일반 요금 등이 섞이므로 제목/본문을 임의로 요금으로 해석하지 않는다.
        Map.entry("notes", List.of("infoname", "infotext", "relateInfo", "placeinfo"))
    );
    private static final List<String> GROUPS = List.of("address", "description", "hours", "closedDays", "generalFee",
            "extraFee", "discount", "reservation", "officialWebsite", "contact", "notes");
    private final JdbcTemplate jdbc;

    public OutingStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public OutingResponse.Page list(OutingQuery query, Instant now) {
        return list(query, now, 20, query.orderBy());
    }

    private OutingResponse.Page list(OutingQuery query, Instant now, int limit, String orderBy) {
        LocalDate today = now.atZone(CollectionPolicy.SEOUL).toLocalDate();
        List<Object> args = new ArrayList<>(List.of(today, today));
        String where = " FROM candidates WHERE period NOT IN ('ENDED', 'CANCELLED')";
        if (!query.keyword().isEmpty()) {
            // strpos는 %·_도 문자 그대로 검색하며 바인딩으로 SQL 삽입을 막는다.
            where += " AND strpos(lower(name), lower(?)) > 0";
            args.add(query.keyword());
        }
        if (!query.region().isEmpty()) { where += " AND region_code = ?"; args.add(query.region()); }
        if (!query.kind().isEmpty()) { where += " AND kind = ?"; args.add(query.kind()); }
        if (!query.period().equals("ALL")) { where += " AND period = ?"; args.add(query.period()); }
        if (query.days() != 0) { where += " AND event_start <= ?::date"; args.add(today.plusDays(query.days())); }
        long total = jdbc.queryForObject(CANDIDATES + "SELECT count(*)" + where, Long.class, args.toArray());
        args.add(limit);
        args.add(query.offset());
        var items = jdbc.query(CANDIDATES + "SELECT *" + where + " ORDER BY " + orderBy + " LIMIT ? OFFSET ?",
                (rs, n) -> summary(rs), args.toArray());
        return new OutingResponse.Page(items, query.page(), limit, total, today);
    }

    public OutingResponse.Home home(String region, String kind, int days, Instant now) {
        // 같은 현재 시각과 읽기 트랜잭션에서 세 구분의 결과를 맞춘다.
        var ongoing = list(new OutingQuery("", region, kind, "ONGOING", "END_DATE", 1), now, 3, "event_end, id");
        var upcoming = list(new OutingQuery("", region, kind, "UPCOMING", "START_DATE", 1, days), now, 3, "event_start, id");
        var permanent = list(new OutingQuery("", region, kind, "PERMANENT", "NAME", 1), now, 3, "name COLLATE \"C\", id");
        return new OutingResponse.Home(ongoing.items().stream().limit(3).toList(),
                upcoming.items().stream().limit(3).toList(), permanent.items().stream().limit(3).toList(),
                ongoing.total() + upcoming.total() + permanent.total(), days, ongoing.asOfDate());
    }

    public OutingResponse.Options options(Instant now) {
        LocalDate today = now.atZone(CollectionPolicy.SEOUL).toLocalDate();
        String where = " FROM candidates WHERE period NOT IN ('ENDED', 'CANCELLED')";
        var regions = jdbc.query(CANDIDATES + "SELECT region_code, region_name, count(*)" + where
                + " GROUP BY region_code, region_name ORDER BY region_code, region_name",
                (rs, n) -> new OutingResponse.Region(rs.getString(1), rs.getString(2), rs.getLong(3)), today, today);
        var kinds = jdbc.query(CANDIDATES + "SELECT kind, count(*)" + where + " GROUP BY kind ORDER BY kind",
                (rs, n) -> new OutingResponse.Kind(rs.getString(1), rs.getLong(2)), today, today);
        return new OutingResponse.Options(regions, kinds, kinds.stream().mapToLong(OutingResponse.Kind::count).sum(), today);
    }

    public OutingResponse.Detail detail(UUID id, Instant now) {
        LocalDate today = now.atZone(CollectionPolicy.SEOUL).toLocalDate();
        var items = jdbc.query(CANDIDATES + "SELECT * FROM candidates WHERE id = ?",
                (rs, n) -> summary(rs), today, today, id);
        if (items.isEmpty()) throw new OutingNotFoundException();
        var item = items.getFirst();
        boolean event = !List.of("MUSEUM", "CULTURAL_SITE").contains(item.kind());
        var sources = jdbc.query("""
            SELECT r.*, (SELECT max(b.collected_at) FROM source_observation b WHERE b.record_id = r.id) AS collected_at
            FROM source_record r WHERE outing_id = ? AND license IN ('KOGL1_DATA', 'TOUR_DATA')
            ORDER BY source, source_key
            """, (rs, n) -> new OutingResponse.Source(rs.getString("source"), rs.getString("source_key"),
                rs.getString("source_url"), rs.getString("license"), instant(rs, "collected_at"),
                instant(rs, "last_success_at"), instant(rs, "last_failure_at"), rs.getString("last_failure_code"),
                CollectionPolicy.stale(event, instant(rs, "last_success_at"), now)), id);
        var evidence = jdbc.query("""
            SELECT f.field_name, f.value #>> '{}' AS value, r.source, r.source_key, f.source_url,
                f.source_reference, b.collected_at, f.checked_at, b.id AS observation_id
            FROM source_record r JOIN source_observation b ON b.record_id = r.id
            JOIN field_evidence f ON f.observation_id = b.id
            JOIN record_operation op ON op.record_id = r.id AND op.last_success_call = b.call_id
            WHERE r.outing_id = ? AND r.license IN ('KOGL1_DATA', 'TOUR_DATA')
            ORDER BY r.source, r.source_key, f.field_name, f.checked_at, b.row_hash, f.id
            """, (rs, n) -> new OutingResponse.Evidence(rs.getString("field_name"), rs.getString("value"),
                rs.getString("source"), rs.getString("source_key"), rs.getString("source_url"),
                rs.getString("source_reference"), instant(rs, "collected_at"), instant(rs, "checked_at"),
                CollectionPolicy.stale(event, instant(rs, "checked_at"), now), rs.getObject("observation_id", UUID.class)), id);
        Map<String, List<OutingResponse.Evidence>> information = new LinkedHashMap<>();
        List<String> unconfirmed = new ArrayList<>();
        for (String group : GROUPS) {
            var values = evidence.stream().filter(e -> FIELDS.get(group).contains(e.field())
                    && e.value() != null && !e.value().isBlank()).distinct().toList();
            information.put(group, values);
            if (values.isEmpty() && !group.equals("notes") && !group.equals("description")) unconfirmed.add(group);
        }
        if (!item.operationVerified()) unconfirmed.add("operation");
        if (event && (item.eventStart() == null || item.eventEnd() == null)) unconfirmed.add("eventDates");
        if (item.feeStatus().equals("UNKNOWN")) unconfirmed.add("adultFee");
        List<OutingResponse.Link> links = new ArrayList<>();
        for (String group : List.of("officialWebsite", "reservation")) {
            for (var value : information.get(group)) {
                String link = CollectionPolicy.safeLink(value.value());
                if (link != null) links.add(new OutingResponse.Link(group, link, value));
            }
        }
        if (links.stream().noneMatch(link -> link.purpose().equals("officialWebsite"))) unconfirmed.add("officialWebsiteLink");
        if (links.stream().noneMatch(link -> link.purpose().equals("reservation"))) unconfirmed.add("reservationLink");
        // 할인 원문에서 기간·증빙·중복 적용 조건을 자동으로 확정하지 않는다.
        unconfirmed.add("discountConditions");
        // 수집된 예약 문장은 예약 기간/잔여석의 확인을 뜻하지 않는다.
        unconfirmed.add("reservationPeriod");
        return new OutingResponse.Detail(item, sources, information, List.copyOf(links), List.copyOf(unconfirmed), today);
    }

    private static OutingResponse.Summary summary(ResultSet rs) throws SQLException {
        return new OutingResponse.Summary(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("kind"),
                rs.getString("region_code"), rs.getString("region_name"), rs.getString("period"),
                rs.getObject("event_start", LocalDate.class), rs.getObject("event_end", LocalDate.class),
                rs.getString("fee_status"), rs.getBigDecimal("adult_fee"), rs.getBoolean("fee_conflict"),
                rs.getBoolean("operation_verified"), instant(rs, "collected_at"), instant(rs, "source_checked_at"),
                rs.getObject("photo_id") == null ? null : new OutingResponse.Photo(rs.getObject("photo_id", UUID.class),
                    rs.getString("photo_url"), rs.getString("photo_thumbnail"), rs.getString("photo_provider"),
                    rs.getString("photo_attribution"), rs.getString("photo_license"), instant(rs, "photo_checked_at")));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
