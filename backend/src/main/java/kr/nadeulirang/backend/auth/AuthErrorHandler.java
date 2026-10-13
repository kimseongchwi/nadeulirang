package kr.nadeulirang.backend.auth;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AuthController.class)
class AuthErrorHandler {
    record Error(String code, String message, boolean retryable) {}

    @ExceptionHandler(AuthFailure.class)
    ResponseEntity<Error> failure(AuthFailure failure) {
        return error(failure.status, failure.code, failure.getMessage());
    }

    @ExceptionHandler(AuthRateLimiter.LimitExceeded.class)
    ResponseEntity<Error> limited() {
        return error(429, "RATE_LIMITED", "요청이 많습니다. 잠시 뒤 다시 시도하세요.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Error> conflict() {
        return error(409, "ACCOUNT_CONFLICT", "이미 사용 중인 로그인 수단입니다.");
    }

    @ExceptionHandler({DataAccessException.class, TransactionException.class})
    ResponseEntity<Error> unavailable() {
        return error(503, "AUTH_UNAVAILABLE", "요청을 처리하지 못했습니다. 다시 시도하세요.");
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
    ResponseEntity<Error> invalid() {
        return error(400, "INVALID_REQUEST", "입력값을 확인하세요.");
    }

    private ResponseEntity<Error> error(int status, String code, String message) {
        return ResponseEntity.status(status)
                .header("Cache-Control", "no-store")
                .body(new Error(code, message, status == 429 || status == 503));
    }

    static void write(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");
        response.getWriter()
                .write(
                        "{\"code\":\""
                                + code
                                + "\",\"message\":\""
                                + message
                                + "\",\"retryable\":"
                                + (status == 503)
                                + "}");
    }
}
