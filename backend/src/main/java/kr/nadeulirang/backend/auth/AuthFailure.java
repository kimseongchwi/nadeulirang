package kr.nadeulirang.backend.auth;

final class AuthFailure extends RuntimeException {
    final int status;
    final String code;
    AuthFailure(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
    static AuthFailure invalid() { return new AuthFailure(400, "INVALID_REQUEST", "입력값을 확인하세요."); }
    static AuthFailure denied() { return new AuthFailure(401, "AUTHENTICATION_FAILED", "인증 정보를 확인하세요."); }
    static AuthFailure conflict() { return new AuthFailure(409, "ACCOUNT_CONFLICT", "이미 사용 중인 로그인 수단입니다."); }
}
