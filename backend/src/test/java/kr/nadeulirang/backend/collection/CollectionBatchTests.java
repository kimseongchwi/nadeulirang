package kr.nadeulirang.backend.collection;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CollectionBatchTests {
    private static final String SCHEMA = "p38_test_" + UUID.randomUUID().toString().replace("-", "");
    private final JsonMapper json = JsonMapper.builder().build();
    @Autowired CollectionStore store;
    @Autowired CollectionCheckpointStore checkpoints;
    @Autowired JdbcTemplate jdbc;
    @TempDir Path directory;
    private final AtomicInteger calls = new AtomicInteger();
    private final AtomicBoolean failIntro = new AtomicBoolean();

    @DynamicPropertySource static void schema(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.default-schema", () -> SCHEMA);
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.datasource.hikari.schema", () -> SCHEMA);
    }
    @BeforeEach void reset() {
        jdbc.execute("TRUNCATE outing,source_call,collection_checkpoint CASCADE");
        jdbc.update("UPDATE collection_source SET blocked_reason=NULL,last_started_at=NULL");
        calls.set(0);
        failIntro.set(false);
    }

    @Test @DisplayName("부분 목록을 보존하고 재실행은 같은 응답의 다음 행부터 수집하며 신규 항목을 자동 공개하지 않는다")
    void resumesSavedRows() throws Exception {
        runBatch();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM outing", Integer.class)).isEqualTo(5);
        runBatch();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM outing", Integer.class)).isEqualTo(10);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public_candidate", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM collection_checkpoint WHERE row_index=2 AND page_call IS NOT NULL", Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM source_call WHERE operation IN ('searchFestival2','areaBasedList2','list')", Integer.class)).isEqualTo(5);
    }

    @Test @DisplayName("JPA 커서는 jsonb 동등성을 유지하고 다른 원천·조건과 미완료 호출은 재사용하지 않는다")
    void checksCheckpointIdentityAndCalls() {
        var query = json.readTree("{\"page\":1,\"kind\":\"문화\"}");
        var first = checkpoints.cursor("identity", Source.TOUR, "areaBasedList2", query);
        assertThat(first).isEqualTo(new CollectionCheckpointStore.Cursor(1, 0, null, false));
        var reordered = json.readTree("{\"kind\":\"문화\",\"page\":1.0}");
        assertThat(checkpoints.cursor("identity", Source.TOUR, "areaBasedList2", reordered)).isEqualTo(first);
        assertThatThrownBy(() -> checkpoints.cursor("identity", Source.MUSEUM, "areaBasedList2", query))
                .isInstanceOf(org.springframework.dao.EmptyResultDataAccessException.class);
        assertThatThrownBy(() -> checkpoints.cursor("identity", Source.TOUR, "list", query))
                .isInstanceOf(org.springframework.dao.EmptyResultDataAccessException.class);
        assertThatThrownBy(() -> checkpoints.cursor("identity", Source.TOUR, "areaBasedList2", json.readTree("{\"page\":2}")))
                .isInstanceOf(org.springframework.dao.EmptyResultDataAccessException.class);

        Instant at = Instant.parse("2026-10-08T00:00:00Z");
        UUID call = store.reserve(Source.TOUR, "areaBasedList2", query, at);
        assertThat(jdbc.queryForObject("SELECT query->>'kind' FROM source_call WHERE id=?", String.class, call)).isEqualTo("문화");
        assertThatThrownBy(() -> checkpoints.savedPage(Source.TOUR, call))
                .isInstanceOf(org.springframework.dao.EmptyResultDataAccessException.class);
        store.finish(call, Source.TOUR, new SourceResponse("EMPTY", "0000", null, java.util.List.of()), at);
        assertThat(checkpoints.savedPage(Source.TOUR, call).response().outcome()).isEqualTo("EMPTY");
        assertThatThrownBy(() -> checkpoints.savedPage(Source.MUSEUM, call))
                .isInstanceOf(org.springframework.dao.EmptyResultDataAccessException.class);
        var saved = new CollectionCheckpointStore.Cursor(2, 3, call, false);
        checkpoints.save("identity", saved);
        assertThat(checkpoints.cursor("identity", Source.TOUR, "areaBasedList2", query)).isEqualTo(saved);
        assertThatThrownBy(() -> checkpoints.save("identity", new CollectionCheckpointStore.Cursor(0, 3, call, false)))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(checkpoints.cursor("identity", Source.TOUR, "areaBasedList2", query)).isEqualTo(saved);
    }

    @Test @DisplayName("상세 실패는 같은 후보 위치에서 멈추고 재실행 성공 뒤 위치를 진행한다")
    void retainsFailedPosition() throws Exception {
        failIntro.set(true);
        assertThatThrownBy(this::runBatch).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT row_index FROM collection_checkpoint WHERE stream_key='test:events'", Integer.class)).isZero();
        runBatch();
        assertThat(jdbc.queryForObject("SELECT row_index FROM collection_checkpoint WHERE stream_key='test:events'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM source_record WHERE source='TOUR' AND source_key='15-0'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM record_operation o JOIN source_record r ON r.id=o.record_id WHERE r.source_key='15-0' AND o.last_failure_at IS NOT NULL", Integer.class)).isZero();
    }

    @Test @DisplayName("배치 정책 실패는 원래 오류를 전달하고 같은 연결의 잠금을 해제한다")
    void releasesLockAfterPolicyFailure() {
        var failure = new IllegalStateException("검증용 호출 상한");
        assertThatThrownBy(() -> checkpoints.withBatchLock(() -> { throw failure; })).isSameAs(failure);
        // 실패 후 다시 실행할 수 있고, 반환된 연결의 세션 잠금이 남지 않는지 검사한다.
        var executed = new AtomicBoolean();
        checkpoints.withBatchLock(() -> executed.set(true));
        assertThat(executed).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND objid=38000", Integer.class)).isZero();
    }

    @Test @DisplayName("마지막 행과 정상 빈 목록의 완료 경계를 구분하고 후보 상한 밖 입력을 거부한다")
    void boundsPagesAndCandidates() {
        var cursor = new CollectionCheckpointStore.Cursor(1,19,UUID.randomUUID(),false);
        var next = CollectionCheckpointStore.next(cursor,20,21);
        assertThat(next.page()).isEqualTo(2);
        assertThat(next.completed()).isFalse();
        assertThat(CollectionCheckpointStore.next(next,1,21).completed()).isTrue();
        assertThat(CollectionCheckpointStore.next(new CollectionCheckpointStore.Cursor(1,0,null,false),0,0).completed()).isTrue();
        for (String value : new String[]{"0","4","101","-1","5.5"}) assertThatThrownBy(() -> CollectionRunner.batchMaximum(value)).isInstanceOf(IllegalArgumentException.class);
        assertThat(CollectionRunner.batchMaximum("100")).isEqualTo(100);
    }

    @Test @DisplayName("다음 순회에서 이전 공개 검토를 재대조해 유지하고 시도 변경은 검토 대기로 되돌린다")
    void rechecksExistingReview() throws Exception {
        runBatch();
        jdbc.update("UPDATE outing SET kind='CULTURAL_SITE',region_code='11',region_name='서울특별시',review_status='APPROVED',reviewed_at=now(),visibility='VISIBLE' WHERE review_key='TOUR:12-0'");
        jdbc.update("UPDATE collection_checkpoint SET row_index=0 WHERE stream_key='test:cultural-sites'");
        runBatch();
        assertThat(jdbc.queryForObject("SELECT review_status FROM outing WHERE review_key='TOUR:12-0'",String.class)).isEqualTo("APPROVED");
        jdbc.update("UPDATE outing SET region_code='41',region_name='경기도' WHERE review_key='TOUR:12-0'");
        jdbc.update("UPDATE collection_checkpoint SET row_index=0 WHERE stream_key='test:cultural-sites'");
        runBatch();
        assertThat(jdbc.queryForObject("SELECT review_status FROM outing WHERE review_key='TOUR:12-0'",String.class)).isEqualTo("PENDING");
    }

    private void runBatch() throws Exception {
        Path keys = directory.resolve("keys.env");
        Files.writeString(keys,"TOURAPI_SERVICE_KEY=test\nMUSEUM_SERVICE_KEY=test\nFESTIVAL_SERVICE_KEY=test\n");
        var client = mock(SourceClient.class);
        when(client.fetch(any(),anyString(),any(),anyString())).thenAnswer(invocation -> {
            Source source = invocation.getArgument(0);
            String operation = invocation.getArgument(1);
            JsonNode query = invocation.getArgument(2);
            Instant at = Instant.now().plusSeconds(calls.incrementAndGet()*2L);
            var call = store.reserve(source,operation,query,at);
            var root = json.createObjectNode();
            var response = root.putObject("response");
            response.putObject("header").put("resultCode",source==Source.TOUR?"0000":"00");
            var body = response.putObject("body");
            var rows = body.putObject("items").putArray("item");
            if (operation.equals("ldongCode2")) rows.addObject().put("lDongRegnCd","11").put("lDongRegnNm","서울특별시");
            else if (operation.startsWith("detail")) {
                String type=query.path("contentId").asText().split("-")[0];
                rows.addObject().put("contentid",query.path("contentId").asText()).put("title","검증 시설")
                        .put("contenttypeid",type).put("addr1","서울특별시 중구").put("lDongRegnCd","11")
                        .put("lclsSystm1",type.equals("12")?"HS":type.equals("14")?"VE":"EV")
                        .put("lclsSystm2",type.equals("15")?"EV01":type.equals("14")?"VE07":"HS01")
                        .put("lclsSystm3",type.equals("14")?"VE070100":"HS010500");
            }
            else for (int i=0;i<20;i++) {
                String type = operation.equals("searchFestival2")?"15":query.path("contentTypeId").asText();
                rows.addObject().put("title","검증 시설").put("contentid",type+"-"+i).put("contenttypeid",type)
                        .put("fcltyNm","검증 박물관 "+i).put("fstvlNm","검증 축제 "+i).put("rdnmadr","서울특별시 중구 "+i)
                        .put("operInstitutionNm","검증 기관").put("mnnstNm","검증 기관");
            }
            body.put("totalCount", operation.equals("list") ? 21 : rows.size());
            var result = operation.equals("detailIntro2") && failIntro.compareAndSet(true,false)
                    ? SourceResponse.failed("CONNECTION_FAILED") : SourceResponse.parse(source,200,(source==Source.TOUR?root:response).toString(),"test");
            store.finish(call,source,result,at);
            return new SourceClient.Result(call,result,at);
        });
        var runner = new CollectionRunner(client,store,mock(ConfigurableApplicationContext.class),checkpoints);
        runner.run(new DefaultApplicationArguments("--collection.mode=batch","--collection.max-items=5","--collection.campaign=test","--collection.env-file="+keys));
    }

    @AfterAll void removeSchema() { jdbc.execute("DROP SCHEMA \""+SCHEMA+"\" CASCADE"); }
}
