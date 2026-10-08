package kr.nadeulirang.backend.collection;

import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.stereotype.Component;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

// 저장소 예외는 Spring Data가 변환하고, 배치 잠금·수집 정책 오류는 원래 타입을 유지한다.
@Component
public class CollectionCheckpointStore {
    private final CollectionCheckpointRepository checkpoints;
    private final SourceCallRepository calls;
    private final DataSource dataSource;

    public CollectionCheckpointStore(CollectionCheckpointRepository checkpoints, SourceCallRepository calls, DataSource dataSource) {
        this.checkpoints = checkpoints;
        this.calls = calls;
        this.dataSource = dataSource;
    }

    public record Cursor(int page, int row, UUID call, boolean completed) { }

    public void withBatchLock(Runnable work) {
        // 배치 전체를 잠가 같은 목록의 커서를 두 프로세스가 동시에 진행하지 않게 한다.
        try (var connection = dataSource.getConnection(); var statement = connection.prepareStatement("SELECT pg_try_advisory_lock(38000)")) {
            try (var result = statement.executeQuery()) {
                result.next();
                if (!result.getBoolean(1)) throw new IllegalStateException("로컬 목록 배치가 이미 실행 중입니다.");
            }
            try { work.run(); }
            finally { try (var unlock = connection.prepareStatement("SELECT pg_advisory_unlock(38000)")) { unlock.execute(); } }
        } catch (java.sql.SQLException e) { throw new IllegalStateException("로컬 배치 잠금에 실패했습니다."); }
    }

    @Transactional
    public Cursor cursor(String key, Source source, String operation, JsonNode query) {
        checkpoints.initialize(key, source.name(), operation, query.toString(), Instant.now());
        return checkpoints.findByStreamKeyAndSourceAndOperationAndQuery(key, source, operation, query.toString())
                .orElseThrow(() -> new EmptyResultDataAccessException(1)).cursor();
    }

    @Transactional(readOnly = true)
    public SourceClient.Result savedPage(Source source, UUID call) {
        var record = calls.findById(call).filter(saved -> saved.source() == source
                && java.util.List.of("SUCCESS", "EMPTY").contains(saved.outcome()))
                .orElseThrow(() -> new EmptyResultDataAccessException(1));
        return new SourceClient.Result(call, record.payload() == null
                        ? new SourceResponse("EMPTY", "03", null, java.util.List.of())
                        : SourceResponse.parse(source, 200, record.payload(), null), record.finishedAt());
    }

    @Transactional
    public void save(String key, Cursor cursor) {
        checkpoints.findById(key).ifPresent(record -> record.advance(cursor, Instant.now()));
    }

    public static Cursor next(Cursor cursor, int rows, int total) {
        if (rows < 0 || rows > 20 || cursor.row() >= rows && rows != 0) throw new IllegalArgumentException("목록 처리 위치가 유효하지 않습니다.");
        int next = cursor.row() + 1;
        if (rows == 0 || next >= rows) {
            boolean done = rows < 20 || (long) (cursor.page() - 1) * 20 + rows >= total;
            return new Cursor(cursor.page() + 1, 0, null, done);
        }
        return new Cursor(cursor.page(), next, cursor.call(), false);
    }
}
