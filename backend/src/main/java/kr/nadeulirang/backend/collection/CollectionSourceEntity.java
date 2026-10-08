package kr.nadeulirang.backend.collection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** 원천별 중단 상태와 마지막 호출 시각. 예약 시 행 잠금으로 여러 실행의 예산을 공유한다. */
@Entity
@Table(name = "collection_source")
class CollectionSourceEntity {
    @Id
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "text")
    private Source name;

    @Column(name = "blocked_reason", columnDefinition = "text")
    private String blockedReason;

    @Column(name = "last_started_at")
    private Instant lastStartedAt;

    protected CollectionSourceEntity() { }

    boolean blocked() { return blockedReason != null; }
    Instant lastStartedAt() { return lastStartedAt; }
    void started(Instant now) { lastStartedAt = now; }
    void block(String reason) { blockedReason = reason; }
}
