package kr.nadeulirang.backend.outing;

import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = OutingController.class)
public class OutingErrorHandler {
    public record Error(String code, String message, boolean retryable) { }

    @ExceptionHandler(OutingNotFoundException.class)
    public ResponseEntity<Error> notFound() {
        return ResponseEntity.status(404).body(new Error("NOT_FOUND", "나들이 정보를 찾을 수 없습니다.", false));
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Error> invalidQuery() {
        return ResponseEntity.badRequest().body(new Error("INVALID_REQUEST", "주소 또는 검색 조건을 확인하세요.", false));
    }

    @ExceptionHandler({DataAccessException.class, TransactionException.class})
    public ResponseEntity<Error> unavailable() {
        return ResponseEntity.status(503).body(new Error("QUERY_UNAVAILABLE", "정보를 불러오지 못했습니다. 다시 시도하세요.", true));
    }
}
