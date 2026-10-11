package kr.nadeulirang.backend.auth;

import java.net.URI;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
class AuthMail {
    private final ObjectProvider<JavaMailSender> senders;
    private final String from;
    private final String origin;
    AuthMail(ObjectProvider<JavaMailSender> senders, @Value("${auth.mail-from:}") String from,
             @Value("${auth.public-origin:http://localhost:3000}") String origin) {
        this.senders = senders; this.from = from; this.origin = origin;
    }
    void send(String email, String purpose, String token) {
        JavaMailSender sender = senders.getIfAvailable();
        if (sender == null || from.isBlank()) throw new AuthFailure(503, "MAIL_UNAVAILABLE", "메일 발송 설정을 확인해야 합니다.");
        URI uri = URI.create(origin);
        if (uri.getHost() == null || uri.getRawQuery() != null || uri.getRawFragment() != null || uri.getUserInfo() != null
                || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && java.util.List.of("localhost", "127.0.0.1").contains(uri.getHost()))))
            throw new AuthFailure(503, "MAIL_UNAVAILABLE", "메일 발송 설정을 확인해야 합니다.");
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from); message.setTo(email);
        message.setSubject("나들이랑 " + (purpose.equals("PASSWORD_RESET") ? "비밀번호 재설정" : "이메일 인증"));
        // URL fragment는 서버 요청·접근 로그로 보내지 않고 브라우저에서 POST 본문으로 전달한다.
        message.setText("아래 주소에서 인증을 완료하세요. 요청하지 않았다면 이 메일을 무시하세요.\n"
                + origin + "/account#" + purpose + ":" + token);
        try { sender.send(message); }
        catch (RuntimeException failure) { throw new AuthFailure(503, "MAIL_UNAVAILABLE", "메일을 보내지 못했습니다. 다시 시도하세요."); }
    }
}
