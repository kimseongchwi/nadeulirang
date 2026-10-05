package kr.nadeulirang.backend.collection;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.JsonNode;

@Repository
public class CollectionCheckpointStore {
    private final JdbcTemplate jdbc;
    private final DataSource dataSource;

    public CollectionCheckpointStore(JdbcTemplate jdbc, DataSource dataSource) {
        this.jdbc = jdbc;
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

    public Cursor cursor(String key, Source source, String operation, JsonNode query) {
        jdbc.update("""
                INSERT INTO collection_checkpoint(stream_key, source, operation, query, updated_at)
                VALUES (?, ?, ?, ?::jsonb, ?) ON CONFLICT(stream_key) DO NOTHING
                """, key, source.name(), operation, query.toString(), Timestamp.from(Instant.now()));
        return jdbc.queryForObject("""
                SELECT page_no,row_index,page_call,completed FROM collection_checkpoint
                WHERE stream_key=? AND source=? AND operation=? AND query=?::jsonb
                """, (rs, n) -> new Cursor(rs.getInt(1), rs.getInt(2), rs.getObject(3, UUID.class), rs.getBoolean(4)),
                key, source.name(), operation, query.toString());
    }

    public SourceClient.Result savedPage(Source source, UUID call) {
        return jdbc.queryForObject("SELECT payload,finished_at FROM source_call WHERE id=? AND source=? AND outcome IN ('SUCCESS','EMPTY')",
                (rs, n) -> new SourceClient.Result(call, rs.getString(1) == null
                        ? new SourceResponse("EMPTY", "03", null, java.util.List.of())
                        : SourceResponse.parse(source, 200, rs.getString(1), null), rs.getTimestamp(2).toInstant()), call, source.name());
    }

    public void save(String key, Cursor cursor) {
        jdbc.update("UPDATE collection_checkpoint SET page_no=?,row_index=?,page_call=?,completed=?,updated_at=? WHERE stream_key=?",
                cursor.page(), cursor.row(), cursor.call(), cursor.completed(), Timestamp.from(Instant.now()), key);
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
