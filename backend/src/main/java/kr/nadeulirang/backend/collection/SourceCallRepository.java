package kr.nadeulirang.backend.collection;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.Repository;

interface SourceCallRepository extends Repository<SourceCallEntity, UUID> {
    SourceCallEntity save(SourceCallEntity call);
    Optional<SourceCallEntity> findById(UUID id);
    long countBySourceAndStartedAtAfter(Source source, Instant boundary);
}
