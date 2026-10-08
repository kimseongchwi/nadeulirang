package kr.nadeulirang.backend.collection;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

interface CollectionCheckpointRepository extends Repository<CollectionCheckpointEntity, String> {
    Optional<CollectionCheckpointEntity> findById(String key);
    // JSON은 DB의 jsonb 동등성으로 비교해 키 순서와 숫자 표기 차이에 영향받지 않는다.
    Optional<CollectionCheckpointEntity> findByStreamKeyAndSourceAndOperationAndQuery(
            String key, Source source, String operation, String query);

    // 최초 생성의 충돌 무시는 DB 유일 제약과 원자적으로 처리한다. 기존 커서를 덮지 않는다.
    @Modifying
    @Query(value = """
            INSERT INTO collection_checkpoint(stream_key, source, operation, query, updated_at)
            VALUES (:key, :source, :operation, CAST(:query AS jsonb), :now)
            ON CONFLICT(stream_key) DO NOTHING
            """, nativeQuery = true)
    void initialize(String key, String source, String operation, String query, Instant now);
}
