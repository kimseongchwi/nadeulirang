package kr.nadeulirang.backend.collection;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

interface CollectionSourceRepository extends Repository<CollectionSourceEntity, Source> {
    Optional<CollectionSourceEntity> findById(Source source);

    // 간격 확인·예산 계산·호출 저장을 동일 트랜잭션에서 직렬화한다.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from CollectionSourceEntity s where s.name = :source")
    CollectionSourceEntity lock(Source source);
}
