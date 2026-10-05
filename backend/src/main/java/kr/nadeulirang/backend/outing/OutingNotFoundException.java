package kr.nadeulirang.backend.outing;

public class OutingNotFoundException extends RuntimeException {
    public OutingNotFoundException() { super("나들이 정보를 찾을 수 없습니다."); }
}
