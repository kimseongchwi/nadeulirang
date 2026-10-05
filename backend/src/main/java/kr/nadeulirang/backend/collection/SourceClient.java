package kr.nadeulirang.backend.collection;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import javax.sql.DataSource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

@Component
public class SourceClient {
    private static final Set<String> TOUR_OPERATIONS = Set.of("ldongCode2", "lclsSystmCode2", "searchKeyword2",
            "searchFestival2", "areaBasedList2", "areaBasedSyncList2", "detailCommon2", "detailIntro2", "detailInfo2");
    private static final Set<String> TOUR_QUERY = Set.of("contentId", "contentTypeId", "numOfRows", "pageNo", "keyword",
            "eventStartDate", "eventEndDate", "lDongListYn", "lclsSystmListYn", "lDongRegnCd", "lclsSystm1", "lclsSystm2", "lclsSystm3", "showflag");
    private final CollectionStore store;
    private final DataSource dataSource;

    public SourceClient(CollectionStore store, DataSource dataSource) {
        this.store = store;
        this.dataSource = dataSource;
    }

    public record Result(java.util.UUID call, SourceResponse response, Instant checkedAt) { }

    public Result fetch(Source source, String operation, JsonNode query, String key) {
        URI uri = buildUri(source, operation, query, key);
        // 세션 잠금은 원천 요청 전체를 직렬화한다. 별도 트랜잭션의 호출 예약은 요청 전에 확정한다.
        try (Connection lock = dataSource.getConnection(); var statement = lock.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
            statement.setLong(1, 11000L + source.ordinal());
            try (var result = statement.executeQuery()) {
                result.next();
                if (!result.getBoolean(1)) throw new IllegalStateException("같은 원천의 수집이 이미 실행 중입니다.");
            }
            try {
                waitForInterval(source);
                java.util.UUID call = store.reserve(source, operation, query, Instant.now());
                SourceResponse reply;
                try (HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                        .followRedirects(HttpClient.Redirect.NEVER).build()) {
                    HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(20)).GET().build();
                    // 문자열 핸들러의 무제한 버퍼링을 피한다. 전체 본문 읽기에도 시간 제한을 적용한다.
                    var response = client.send(request, limitedBody());
                    if (response.body().length > 2_000_000) reply = SourceResponse.failed("BODY_TOO_LARGE");
                    else reply = SourceResponse.parse(source, response.statusCode(), new String(response.body(), StandardCharsets.UTF_8), key);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    reply = SourceResponse.failed("INTERRUPTED");
                } catch (Exception e) { reply = SourceResponse.failed("CONNECTION_FAILED"); }
                Instant now = Instant.now();
                store.finish(call, source, reply, now);
                return new Result(call, reply, now);
            } finally {
                try (var unlock = lock.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                    unlock.setLong(1, 11000L + source.ordinal());
                    unlock.execute();
                }
            }
        } catch (java.sql.SQLException e) { throw new IllegalStateException("원천 수집 잠금에 실패했습니다."); }
    }

    private void waitForInterval(Source source) {
        // 직렬 잠금 아래 확인하므로 다른 실행도 같은 시작 간격을 사용한다.
        try (var connection = dataSource.getConnection(); var statement = connection.prepareStatement("SELECT last_started_at FROM collection_source WHERE name = ?")) {
            statement.setString(1, source.name());
            try (var result = statement.executeQuery()) {
                result.next();
                var last = result.getTimestamp(1);
                if (last != null) {
                    long delay = Duration.between(Instant.now(), last.toInstant().plusMillis(1010)).toMillis();
                    if (delay > 0 && delay <= 2000) Thread.sleep(delay);
                    else if (delay > 2000) throw new IllegalStateException("원천 호출 시각이 현재보다 앞섭니다. 시계를 확인하세요.");
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("수집 대기를 중단했습니다.");
        } catch (java.sql.SQLException e) { throw new IllegalStateException("원천 호출 간격을 확인하지 못했습니다."); }
    }

    public static URI buildUri(Source source, String operation, JsonNode query, String key) {
        if (key == null || key.isBlank() || key.matches(".*%[0-9a-fA-F]{2}.*")) throw new IllegalArgumentException("로컬 Decoding 인증키가 필요합니다.");
        if (!query.isObject()) throw new IllegalArgumentException("조회 조건은 객체여야 합니다.");
        if (source == Source.TOUR && !TOUR_OPERATIONS.contains(operation)
                || source != Source.TOUR && !operation.equals("list")) throw new IllegalArgumentException("허용되지 않은 원천 오퍼레이션입니다.");
        Map<String, String> params = new TreeMap<>();
        params.put("numOfRows", "20");
        params.put("pageNo", "1");
        if (source == Source.TOUR) {
            params.put("MobileOS", "WEB"); params.put("MobileApp", "nadeulirang"); params.put("_type", "json");
        } else params.put("type", "json");
        for (var property : query.properties()) {
            String name = property.getKey();
            Set<String> allowed = source == Source.TOUR ? TOUR_QUERY : source == Source.FESTIVAL
                    ? Set.of("fstvlNm", "rdnmadr", "referenceDate", "numOfRows", "pageNo")
                    : Set.of("fcltyNm", "rdnmadr", "referenceDate", "numOfRows", "pageNo");
            if (!allowed.contains(name) || !property.getValue().isValueNode() || property.getValue().isNull()) {
                throw new IllegalArgumentException("허용되지 않은 조회 조건입니다.");
            }
            params.put(name, property.getValue().asText());
        }
        if (!params.get("numOfRows").matches("[0-9]{1,2}") || Integer.parseInt(params.get("numOfRows")) < 1
                || Integer.parseInt(params.get("numOfRows")) > 20 || !params.get("pageNo").matches("[1-9][0-9]{0,6}")) {
            throw new IllegalArgumentException("수집 요청은 1~20건과 양의 페이지 번호만 허용합니다.");
        }
        params.put("serviceKey", key.strip());
        String encoded = params.entrySet().stream().map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(java.util.stream.Collectors.joining("&"));
        return URI.create(source.endpoint + (source == Source.TOUR ? operation : "") + "?" + encoded);
    }

    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }

    private static HttpResponse.BodyHandler<byte[]> limitedBody() {
        return info -> new HttpResponse.BodySubscriber<>() {
            private final HttpResponse.BodySubscriber<byte[]> delegate = HttpResponse.BodySubscribers.ofByteArray();
            private java.util.concurrent.Flow.Subscription subscription;
            private long size;

            @Override public java.util.concurrent.CompletionStage<byte[]> getBody() { return delegate.getBody(); }
            @Override public void onSubscribe(java.util.concurrent.Flow.Subscription value) {
                subscription = value;
                delegate.onSubscribe(value);
            }
            @Override public void onNext(java.util.List<java.nio.ByteBuffer> buffers) {
                size += buffers.stream().mapToLong(java.nio.ByteBuffer::remaining).sum();
                if (size > 2_000_000) {
                    subscription.cancel();
                    delegate.onError(new IllegalStateException("원천 본문 크기 제한을 초과했습니다."));
                } else delegate.onNext(buffers);
            }
            @Override public void onError(Throwable error) { delegate.onError(error); }
            @Override public void onComplete() { delegate.onComplete(); }
        };
    }
}
