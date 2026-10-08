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

/** 실패·실행 중 시도도 남기는 호출 기록. JSON 문자열은 jsonb로 보존하며 API에 노출하지 않는다. */
@Entity
@Table(name = "source_call")
class SourceCallEntity {
    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "text")
    private Source source;

    @Column(nullable = false, columnDefinition = "text")
    private String operation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String query;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(nullable = false, columnDefinition = "text")
    private String outcome;

    @Column(name = "result_code", columnDefinition = "text")
    private String resultCode;

    // 실패는 본문이 없을 수 있다. 원천/커서 참조는 ID로만 매핑해 연쇄 조회·삭제를 막는다.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String payload;

    protected SourceCallEntity() { }

    SourceCallEntity(UUID id, Source source, String operation, String query, Instant now) {
        this.id = id;
        this.source = source;
        this.operation = operation;
        this.query = query;
        this.startedAt = now;
        this.outcome = "STARTED";
    }

    void finish(SourceResponse reply, Instant now) {
        finishedAt = now;
        outcome = reply.outcome();
        resultCode = reply.code();
        payload = reply.payload() == null ? null : reply.payload().toString();
    }

    Source source() { return source; }
    String outcome() { return outcome; }
    String payload() { return payload; }
    Instant finishedAt() { return finishedAt; }
}
