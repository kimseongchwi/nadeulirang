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
    private final CollectionCheckpointStore checkpoints;
    private final JsonMapper json = JsonMapper.builder().build();
    private final Set<Source> stopped = java.util.EnumSet.noneOf(Source.class);
    private int attempts;
    private int candidates;
    private int failures;
    private int callLimit = 100;

    public CollectionRunner(SourceClient client, CollectionStore store, ConfigurableApplicationContext context, CollectionCheckpointStore checkpoints) {
        this.client = client;
        this.store = store;
        this.context = context;
        this.checkpoints = checkpoints;
    }

    @Override public void run(ApplicationArguments arguments) throws Exception {
        try {
            String mode = option(arguments, "collection.mode", "seed");
            if (!java.util.Set.of("seed", "batch", "supplement").contains(mode)) throw new IllegalArgumentException("수집 방식은 seed, batch 또는 supplement입니다.");
            int maximum = batchMaximum(option(arguments, "collection.max-items", "100"));
            String campaign = option(arguments, "collection.campaign", java.time.LocalDate.now(CollectionPolicy.SEOUL).toString().substring(0, 7));
            if (!campaign.matches("[A-Za-z0-9_-]{1,40}")) throw new IllegalArgumentException("배치 이름은 영문·숫자·밑줄·하이픈 1~40자입니다.");
            // 파일을 코드로 실행하지 않고 허용된 키만 읽는다. 환경 변수나 로그로 키를 전달하지 않는다.
            var envOptions = arguments.getOptionValues("collection.env-file");
            Map<String, String> keys = readKeys(Path.of(envOptions == null ? ".env" : envOptions.getFirst()));
            JsonNode seed;
            var seedFile = arguments.getOptionValues("collection.seed-file");
            if (seedFile == null) {
                try (var stream = getClass().getResourceAsStream("/collection-seed.json")) { seed = json.readTree(stream); }
            } else seed = json.readTree(Files.readString(Path.of(seedFile.getFirst())));
            if (!seed.isObject() || !seed.path("tour").isArray() || !seed.path("standard").isArray()) throw new IllegalArgumentException("검토 목록에는 tour·standard 배열이 필요합니다.");
            var needed = mode.equals("supplement") ? supplementSources(seed) : java.util.EnumSet.allOf(Source.class);
            for (Source source : needed) {
                if (keys.getOrDefault(source.keyName, "").isBlank()) throw new IllegalStateException("대상 원천의 로컬 키를 설정하세요.");
                if (store.blocked(source)) { stopped.add(source); failures++; }
            }
            Map<String, String> regions = new HashMap<>();
            java.util.List<JsonNode> codeRows = stopped.contains(Source.TOUR) || mode.equals("supplement") ? java.util.List.of()
                    : fetch(Source.TOUR, "ldongCode2", json.createObjectNode(), keys).response().rows();
            for (JsonNode row : codeRows) {
                String code = CollectionStore.text(row, "lDongRegnCd");
                if (code.isEmpty()) code = CollectionStore.text(row, "code");
                String name = CollectionStore.text(row, "lDongRegnNm");
                if (name.isEmpty()) name = CollectionStore.text(row, "name");
                if (!code.isEmpty() && !name.isEmpty()) regions.put(code, name);
            }
            // 코드 응답은 원천 호출 원문에 보존한다. 이름만으로 옛 광주·전남 코드를 합치지 않는다.
            if (mode.equals("supplement")) {
                if (seedFile == null) throw new IllegalArgumentException("보완 수집에는 대상 목록 파일이 필요합니다.");
                var operations = supplementOperations(option(arguments, "collection.operations", "detailIntro2,detailInfo2"));
                for (JsonNode item : seed.path("tour")) collectSupplement(item, operations, keys);
                for (JsonNode item : seed.path("standard")) collectStandardSupplement(item, keys);
            } else if (mode.equals("batch")) {
                callLimit = 400;
                JsonNode reviewed = seed;
                checkpoints.withBatchLock(() -> collectBatch(campaign, maximum, reviewed, regions, keys));
            } else if (mode.equals("seed")) {
                for (JsonNode item : seed.path("tour")) collectTour(item, regions, keys, true);
            }
            if (mode.equals("seed") && !stopped.contains(Source.TOUR)) {
                var sync = fetch(Source.TOUR, "areaBasedSyncList2", json.createObjectNode().put("showflag", "0"), keys);
                sync.response().rows().forEach(store::applySyncFlag);
            }
            if (mode.equals("seed")) for (JsonNode item : seed.path("standard")) collectStandard(item, keys);
            System.out.println("수집 요약: 호출=" + attempts + ", 저장 처리한 원천 행=" + candidates + ", 실패=" + failures);
            System.out.println("검토된 공개 후보(종료 행사 포함): " + store.summary());
            if (failures > 0) throw new IllegalStateException("일부 수집에 실패했습니다. DB 호출 결과와 마지막 성공 정보를 확인하세요.");
        } finally { context.close(); }
    }

    private void collectTour(JsonNode item, Map<String, String> regions, Map<String, String> keys, boolean reviewed) {
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
        boolean regionAccepted = region != null && address.startsWith(region)
                && (!item.has("regionCode") || item.path("regionCode").asText().equals(code));
        String reason = reviewed && accepted && regionAccepted ? "검토 목록의 이름/종류 코드/시도 주소 재대조, 데이터 이용허락 확인" : null;
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

    static java.util.List<String> supplementOperations(String value) {
        var operations = java.util.Arrays.asList(value.split(",", -1));
        if (operations.isEmpty() || operations.stream().distinct().count() != operations.size()
                || operations.stream().anyMatch(op -> !java.util.Set.of("detailIntro2", "detailInfo2").contains(op)))
            throw new IllegalArgumentException("보완 오퍼레이션은 detailIntro2,detailInfo2 중 중복 없이 지정하세요.");
        return operations;
    }

    static java.util.Set<Source> supplementSources(JsonNode seed) {
        var sources = java.util.EnumSet.noneOf(Source.class);
        if (!seed.path("tour").isEmpty()) sources.add(Source.TOUR);
        for (JsonNode item : seed.path("standard")) {
            String name = item.path("source").asText();
            if (!java.util.Set.of("MUSEUM", "FESTIVAL").contains(name))
                throw new IllegalArgumentException("표준 보완 원천은 MUSEUM 또는 FESTIVAL입니다.");
            sources.add(Source.valueOf(name));
        }
        if (sources.isEmpty()) throw new IllegalArgumentException("보완할 기존 대상이 필요합니다.");
        return sources;
    }

    private void collectStandardSupplement(JsonNode item, Map<String, String> keys) {
        Source source = Source.valueOf(item.path("source").asText());
        String key = item.path("sourceKey").asText();
        if (!store.hasSource(source, key)) throw new IllegalArgumentException("표준 보완에는 기존 sourceKey가 필요합니다.");
        if (stopped.contains(source)) return;
        String name = item.path("name").asText();
        String filter = source == Source.MUSEUM ? "fcltyNm" : "fstvlNm";
        if (name.isBlank()) throw new IllegalArgumentException("표준 보완에는 대상 이름이 필요합니다.");
        var reply = fetch(source, "list", json.createObjectNode().put(filter, name), keys);
        if (reply.response().outcome().equals("FAILED")) store.failedRecord(source, key, "list", reply.response().code(), reply.checkedAt());
        boolean matched = false;
        for (JsonNode row : reply.response().rows()) {
            if (!CollectionPolicy.hash(CollectionStore.identity(source, row)).equals(key)) continue;
            store.ingest(source, reply.call(), row, "list", null, null, null, null, null, reply.checkedAt());
            matched = true;
            candidates++;
        }
        if (!matched && !reply.response().outcome().equals("FAILED")) store.emptyOperation(source, key, "list", reply.checkedAt());
    }

    private void collectSupplement(JsonNode item, java.util.List<String> operations, Map<String, String> keys) {
        String id = item.path("id").asText();
        var reviewed = store.reviewedTour(id);
        if (reviewed == null) throw new IllegalArgumentException("보완 대상은 이미 저장·검토된 TourAPI ID여야 합니다.");
        String type = reviewed.kind().equals("MUSEUM") ? "14" : reviewed.kind().equals("CULTURAL_SITE") ? "12" : "15";
        for (String operation : operations) {
            if (stopped.contains(Source.TOUR)) break;
            var reply = fetch(Source.TOUR, operation, json.createObjectNode().put("contentId", id).put("contentTypeId", type), keys);
            if (reply.response().outcome().equals("FAILED")) store.failedRecord(Source.TOUR, id, operation, reply.response().code(), reply.checkedAt());
            if (reply.response().outcome().equals("EMPTY")) store.emptyOperation(Source.TOUR, id, operation, reply.checkedAt());
            for (JsonNode row : reply.response().rows()) {
                if (!id.equals(CollectionStore.text(row, "contentid"))) throw new IllegalStateException("요청과 다른 보완 식별자입니다.");
                store.ingest(Source.TOUR, reply.call(), row, operation, null, null, null, null, null, reply.checkedAt());
                candidates++;
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
        if (++attempts > callLimit) throw new IllegalStateException("이번 실행의 원천 호출 상한을 소진했습니다. 저장 위치부터 다음 실행에 이어가세요.");
        var result = client.fetch(source, operation, query, keys.get(source.keyName));
        if (result.response().outcome().equals("FAILED")) {
            failures++;
            if (CollectionPolicy.blockingCode(result.response().code()) != null) stopped.add(source);
        }
        return result;
    }

    static int batchMaximum(String value) {
        if (!value.matches("[0-9]{1,3}")) throw new IllegalArgumentException("배치 후보는 5~100개입니다.");
        int maximum = Integer.parseInt(value);
        if (maximum < 5 || maximum > 100) throw new IllegalArgumentException("배치 후보는 5~100개입니다.");
        return maximum;
    }

    private static String option(ApplicationArguments args, String name, String fallback) {
        var values = args.getOptionValues(name);
        if (values == null) return fallback;
        if (values.size() != 1 || values.getFirst().isBlank()) throw new IllegalArgumentException("수집 옵션은 한 값만 입력하세요.");
        return values.getFirst();
    }

    private record Stream(String name, Source source, String operation, JsonNode query) { }

    private void collectBatch(String campaign, int maximum, JsonNode reviewed, Map<String, String> regions, Map<String, String> keys) {
        var month = java.time.LocalDate.now(CollectionPolicy.SEOUL).withDayOfMonth(1);
        var format = java.time.format.DateTimeFormatter.BASIC_ISO_DATE;
        var streams = java.util.List.of(
                new Stream("events", Source.TOUR, "searchFestival2", json.createObjectNode()
                        .put("eventStartDate", month.minusYears(1).format(format)).put("eventEndDate", month.plusMonths(3).minusDays(1).format(format))),
                new Stream("tour-museums", Source.TOUR, "areaBasedList2", json.createObjectNode().put("contentTypeId", "14")
                        .put("lclsSystm1", "VE").put("lclsSystm2", "VE07").put("lclsSystm3", "VE070100")),
                new Stream("cultural-sites", Source.TOUR, "areaBasedList2", json.createObjectNode().put("contentTypeId", "12").put("lclsSystm1", "HS")),
                new Stream("standard-museums", Source.MUSEUM, "list", json.createObjectNode()),
                new Stream("standard-festivals", Source.FESTIVAL, "list", json.createObjectNode()));
        int listCalls = 0;
        for (int streamIndex = 0; streamIndex < streams.size(); streamIndex++) {
            Stream stream = streams.get(streamIndex);
            if (stopped.contains(stream.source())) continue;
            String key = campaign + ":" + stream.name();
            var cursor = checkpoints.cursor(key, stream.source(), stream.operation(), stream.query());
            int quota = maximum / streams.size() + (streamIndex < maximum % streams.size() ? 1 : 0);
            int processed = 0;
            while (!cursor.completed() && processed < quota) {
                SourceClient.Result page;
                if (cursor.call() == null) {
                    if (++listCalls > 100) { System.out.println("목록 호출 100회 도달: 다음 실행에 이어갑니다."); return; }
                    var query = stream.query().deepCopy();
                    ((tools.jackson.databind.node.ObjectNode) query).put("pageNo", cursor.page());
                    page = fetch(stream.source(), stream.operation(), query, keys);
                    if (page.response().outcome().equals("FAILED")) break;
                    cursor = new CollectionCheckpointStore.Cursor(cursor.page(), 0, page.call(), false);
                    checkpoints.save(key, cursor);
                } else page = checkpoints.savedPage(stream.source(), cursor.call());
                if (page.response().outcome().equals("FAILED")) throw new IllegalStateException("보존된 목록 응답을 읽을 수 없습니다.");
                var rows = page.response().rows();
                int total = page.response().totalCount();
                if (rows.isEmpty()) {
                    cursor = CollectionCheckpointStore.next(cursor, 0, total);
                    checkpoints.save(key, cursor);
                    break;
                }
                JsonNode row = rows.get(cursor.row());
                String name = CollectionStore.text(row, stream.source() == Source.TOUR ? "title" : stream.source() == Source.MUSEUM ? "fcltyNm" : "fstvlNm");
                var end = CollectionPolicy.date(CollectionStore.text(row, stream.source() == Source.TOUR ? "eventenddate" : "fstvlEndDate"));
                boolean expired = end != null && end.isBefore(java.time.LocalDate.now(CollectionPolicy.SEOUL));
                if (!name.isBlank() && !expired) {
                    int beforeFailures = failures;
                    if (stream.source() == Source.TOUR) {
                        String id = CollectionStore.text(row, "contentid");
                        if (id.isBlank()) throw new IllegalStateException("목록의 원천 식별자가 없습니다.");
                        JsonNode item = json.createObjectNode().put("id", id).put("name", name).put("type", CollectionStore.text(row, "contenttypeid"))
                                .put("kind", CollectionPolicy.tourKind(CollectionStore.text(row, "contenttypeid"), CollectionStore.text(row, "lclsSystm1"),
                                        CollectionStore.text(row, "lclsSystm2"), CollectionStore.text(row, "lclsSystm3")));
                        boolean accepted = false;
                        for (JsonNode known : reviewed.path("tour")) if (known.path("id").asText().equals(id)) { item = known; accepted = true; break; }
                        if (!accepted) {
                            var previous = store.reviewedTour(id);
                            if (previous != null) {
                                item = json.createObjectNode().put("id",id).put("name",previous.name()).put("kind",previous.kind())
                                        .put("type",previous.kind().equals("MUSEUM")?"14":previous.kind().equals("CULTURAL_SITE")?"12":"15")
                                        .put("regionCode",previous.regionCode());
                                accepted = true;
                            }
                        }
                        collectTour(item, regions, keys, accepted);
                    } else {
                        store.ingest(stream.source(), page.call(), row, "list", null, null, null, null, null, page.checkedAt());
                        candidates++;
                    }
                    // 상세 실패 시 위치를 진행하지 않고 마지막 성공 정보를 보존해 다음 실행에 재조회한다.
                    if (failures > beforeFailures) break;
                    processed++;
                }
                cursor = CollectionCheckpointStore.next(cursor, rows.size(), total);
                checkpoints.save(key, cursor);
            }
            System.out.println("목록 배치 " + stream.name() + ": 저장 처리=" + processed + ", 다음 페이지=" + cursor.page() + ", 행=" + cursor.row() + ", 목록 완료=" + cursor.completed());
        }
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
