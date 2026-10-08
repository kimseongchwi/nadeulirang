package kr.nadeulirang.backend.collection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 목록 응답과 처리 위치를 함께 보존한다. 완료·실패 위치와 원천 식별자는 기존 제약을 따른다. */
@Entity
@Table(name = "collection_checkpoint")
class CollectionCheckpointEntity {
    @Id
    @Column(name = "stream_key", columnDefinition = "text")
    private String streamKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "text")
    private Source source;

    @Column(nullable = false, columnDefinition = "text")
    private String operation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String query;

    @Column(name = "page_no", nullable = false)
    private int page;

    @Column(name = "row_index", nullable = false)
    private int row;

    // 새 페이지와 완료 상태에는 호출 참조가 없다. FK는 Flyway가 보장한다.
    @Column(name = "page_call")
    private UUID call;

    @Column(nullable = false)
    private boolean completed;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CollectionCheckpointEntity() { }

    CollectionCheckpointStore.Cursor cursor() {
        return new CollectionCheckpointStore.Cursor(page, row, call, completed);
    }

    void advance(CollectionCheckpointStore.Cursor cursor, Instant now) {
        page = cursor.page();
        row = cursor.row();
        call = cursor.call();
        completed = cursor.completed();
        updatedAt = now;
    }
}
