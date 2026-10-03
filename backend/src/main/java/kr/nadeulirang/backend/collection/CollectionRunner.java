package kr.nadeulirang.backend.collection;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
@ConditionalOnProperty(name = "collection.run", havingValue = "true")
public class CollectionRunner implements ApplicationRunner {
    private final SourceClient client;
    private final CollectionStore store;
    private final ConfigurableApplicationContext context;
    private final JsonMapper json = JsonMapper.builder().build();
    private final Set<Source> stopped = java.util.EnumSet.noneOf(Source.class);
    private int attempts;
    private int candidates;
    private int failures;

    public CollectionRunner(SourceClient client, CollectionStore store, ConfigurableApplicationContext context) {
        this.client = client;
        this.store = store;
        this.context = context;
    }

    @Override public void run(ApplicationArguments arguments) throws Exception {
        try {
            // 파일을 코드로 실행하지 않고 허용된 키만 읽는다. 환경 변수나 로그로 키를 전달하지 않는다.
            var envOptions = arguments.getOptionValues("collection.env-file");
            Map<String, String> keys = readKeys(Path.of(envOptions == null ? ".env" : envOptions.getFirst()));
            for (Source source : Source.values()) {
                if (keys.getOrDefault(source.keyName, "").isBlank()) throw new IllegalStateException("로컬 원천 키를 모두 설정하세요.");
                if (store.blocked(source)) { stopped.add(source); failures++; }
            }
            JsonNode seed;
            try (var stream = getClass().getResourceAsStream("/collection-seed.json")) { seed = json.readTree(stream); }
            Map<String, String> regions = new HashMap<>();
            java.util.List<JsonNode> codeRows = stopped.contains(Source.TOUR) ? java.util.List.of()
                    : fetch(Source.TOUR, "ldongCode2", json.createObjectNode(), keys).response().rows();
            for (JsonNode row : codeRows) {
                String code = CollectionStore.text(row, "lDongRegnCd");
                if (code.isEmpty()) code = CollectionStore.text(row, "code");
                String name = CollectionStore.text(row, "lDongRegnNm");
                if (name.isEmpty()) name = CollectionStore.text(row, "name");
                if (!code.isEmpty() && !name.isEmpty()) regions.put(code, name);
            }
            // 코드 응답은 원천 호출 원문에 보존한다. 이름만으로 옛 광주·전남 코드를 합치지 않는다.
            for (JsonNode item : seed.path("tour")) collectTour(item, regions, keys);
            if (!stopped.contains(Source.TOUR)) {
                var sync = fetch(Source.TOUR, "areaBasedSyncList2", json.createObjectNode().put("showflag", "0"), keys);
                sync.response().rows().forEach(store::applySyncFlag);
            }
            for (JsonNode item : seed.path("standard")) collectStandard(item, keys);
            System.out.println("수집 요약: 호출=" + attempts + ", 저장 처리한 원천 행=" + candidates + ", 실패=" + failures);
            System.out.println("검토된 공개 후보(종료 행사 포함): " + store.summary());
            if (failures > 0) throw new IllegalStateException("일부 수집에 실패했습니다. DB 호출 결과와 마지막 성공 정보를 확인하세요.");
        } finally { context.close(); }
    }

    private void collectTour(JsonNode item, Map<String, String> regions, Map<String, String> keys) {
        if (stopped.contains(Source.TOUR)) return;
        String id = item.path("id").asText();
        var query = json.createObjectNode().put("contentId", id);
        var common = fetch(Source.TOUR, "detailCommon2", query, keys);
        if (common.response().rows().isEmpty()) {
            if (common.response().outcome().equals("EMPTY")) failures++;
            store.failedRecord(Source.TOUR, id, "detailCommon2", common.response().outcome().equals("EMPTY") ? "EMPTY_DETAIL" : common.response().code(), common.checkedAt());
            return;
        }
        JsonNode row = common.response().rows().getFirst();
        if (!CollectionStore.text(row, "contentid").equals(id)) throw new IllegalStateException("요청과 다른 원천 식별자입니다.");
        String mapped = CollectionPolicy.tourKind(CollectionStore.text(row, "contenttypeid"),
                CollectionStore.text(row, "lclsSystm1"), CollectionStore.text(row, "lclsSystm2"), CollectionStore.text(row, "lclsSystm3"));
        String expectedKind = item.path("kind").asText();
        if (mapped == null && item.path("institutionReviewed").asBoolean(false)
                && expectedKind.equals("MUSEUM") && CollectionStore.text(row, "contenttypeid").equals("14")) mapped = expectedKind;
        boolean accepted = CollectionPolicy.normalize(CollectionStore.text(row, "title")).equals(CollectionPolicy.normalize(item.path("name").asText()))
                && expectedKind.equals(mapped) && item.path("type").asText().equals(CollectionStore.text(row, "contenttypeid"));
        String code = CollectionStore.text(row, "lDongRegnCd");
        String region = regions.get(code);
        // 코드 목록과 실제 주소를 함께 대조한 표본만 승인한다. 알 수 없는 지역은 보류한다.
        String address = CollectionStore.text(row, "addr1");
        boolean regionAccepted = region != null && address.startsWith(region);
        String reason = accepted && regionAccepted ? "P06 표본·기관 소개와 이름/종류 코드/시도 주소 재대조, 데이터 이용허락 확인" : null;
        boolean due = store.needsDetails(id, CollectionStore.text(row, "modifiedtime"), item.path("type").asText().equals("15"), common.checkedAt());
        store.ingest(Source.TOUR, common.call(), row, "detailCommon2", "TOUR:" + id,
                reason == null ? null : mapped, reason == null ? null : code, reason == null ? null : region, reason, common.checkedAt());
        candidates++;
        if (!due) return;
        for (String operation : java.util.List.of("detailIntro2", "detailInfo2")) {
            if (stopped.contains(Source.TOUR)) break;
            var detail = fetch(Source.TOUR, operation, json.createObjectNode().put("contentId", id).put("contentTypeId", item.path("type").asText()), keys);
            if (detail.response().outcome().equals("FAILED")) store.failedRecord(Source.TOUR, id, operation, detail.response().code(), detail.checkedAt());
            if (detail.response().outcome().equals("EMPTY")) store.emptyOperation(Source.TOUR, id, operation, detail.checkedAt());
            for (JsonNode data : detail.response().rows()) {
                if (!CollectionStore.text(data, "contentid").equals(id)) throw new IllegalStateException("요청과 다른 상세 식별자입니다.");
                store.ingest(Source.TOUR, detail.call(), data, operation, "TOUR:" + id, null, null, null, null, detail.checkedAt());
            }
        }
    }

    private void collectStandard(JsonNode item, Map<String, String> keys) {
        Source source = Source.valueOf(item.path("source").asText());
        if (stopped.contains(source)) return;
        var result = fetch(source, "list", json.createObjectNode().put(item.path("filter").asText(), item.path("name").asText()), keys);
        for (JsonNode row : result.response().rows()) {
            String name = CollectionStore.text(row, source == Source.MUSEUM ? "fcltyNm" : "fstvlNm");
            // 부분 검색의 유사 이름은 검토 없이 연결하지 않는다.
            if (!CollectionPolicy.normalize(name).equals(CollectionPolicy.normalize(item.path("name").asText()))) continue;
            // P06에서 확인한 두 교차 원천 연결만 적용한다. 이름이 같은 임의 시설에는 확대하지 않는다.
            String target = item.path("target").asText(null);
            if (target != null && !store.matchesReviewedTarget(target, row)) target = null;
            String reason = target == null ? null : "P06 기관 소개로 동일 시설 확인, 주소/요금 충돌 원문 보존";
            store.ingest(source, result.call(), row, "list", target, null, null, null, reason, result.checkedAt());
            if (target != null) {
                store.relink(source, CollectionPolicy.hash(CollectionStore.identity(source, row)), target, reason, result.checkedAt());
            }
            candidates++;
        }
    }

    private SourceClient.Result fetch(Source source, String operation, JsonNode query, Map<String, String> keys) {
        if (++attempts > 100) throw new IllegalStateException("초기 수집의 목록·상세 호출 상한 100회입니다.");
        var result = client.fetch(source, operation, query, keys.get(source.keyName));
        if (result.response().outcome().equals("FAILED")) {
            failures++;
            if (CollectionPolicy.blockingCode(result.response().code()) != null) stopped.add(source);
        }
        return result;
    }

    static Map<String, String> readKeys(Path path) throws java.io.IOException {
        String profile = System.getenv("USERPROFILE");
        String home = profile == null || profile.isBlank() ? System.getProperty("user.home") : profile;
        return readKeys(path, Path.of(home, ".nadeulirang", ".env"));
    }

    static Map<String, String> readKeys(Path path, Path sharedFile) throws java.io.IOException {
        Map<String, String> keys = new HashMap<>();
        for (Path file : java.util.List.of(sharedFile, path)) {
            if (!Files.exists(file)) continue;
            for (String line : Files.readAllLines(file)) {
                int separator = line.indexOf('=');
                if (separator < 1) continue;
                String name = line.substring(0, separator).strip();
                if (java.util.Arrays.stream(Source.values()).noneMatch(source -> source.keyName.equals(name))) continue;
                String value = line.substring(separator + 1).strip();
                if (value.length() >= 2 && (value.startsWith("\"") && value.endsWith("\"") || value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }
                if (!value.isBlank()) keys.put(name, value);
            }
        }
        return keys;
    }
}
