package kr.nadeulirang.backend.collection;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.regex.Pattern;

public final class CollectionPolicy {
    public static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final Pattern URL = Pattern.compile("https?://[^\\s<>\"']+");

    private CollectionPolicy() { }

    public static String normalize(String value) {
        return value.replaceAll("\\([^)]*\\)", "").replaceAll("\\s+", "").strip();
    }

    public static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 지원이 필요합니다.");
        }
    }

    public static BigDecimal numericFee(String value) {
        if (value == null || !value.matches("[0-9]{1,9}(\\.[0-9]{1,2})?")) return null;
        return new BigDecimal(value).stripTrailingZeros();
    }

    public static String safeLink(String value) {
        var matcher = URL.matcher(value);
        if (!matcher.find()) return null;
        String candidate = matcher.group();
        try {
            var uri = java.net.URI.create(candidate);
            if (uri.getHost() == null || uri.getRawUserInfo() != null) return null;
            return candidate;
        } catch (IllegalArgumentException e) { return null; }
    }

    public static String tourKind(String type, String first, String second, String third) {
        if (type.equals("15")) {
            if (third.equals("EV030100")) return "EXHIBITION";
            if (second.equals("EV01")) return "FESTIVAL";
            if (second.equals("EV02") || second.equals("EV03")) return "EVENT";
        }
        if (type.equals("14") && third.equals("VE070100")) return "MUSEUM";
        if (type.equals("12") && (first.equals("HS") || first.equals("VE"))) return "CULTURAL_SITE";
        return null;
    }

    public static LocalDate date(String value) {
        try {
            if (value.matches("[0-9]{8}")) {
                return LocalDate.parse(value, java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
            }
            return LocalDate.parse(value);
        } catch (java.time.DateTimeException e) { return null; }
    }

    public static boolean stale(boolean event, Instant success, Instant now) {
        return success == null || success.isBefore(now.minus(event ? Duration.ofHours(48) : Duration.ofDays(30)));
    }

    public static boolean detailDue(boolean event, boolean changed, Instant success, Instant now) {
        return changed || success == null || !success.isAfter(now.minus(Duration.ofDays(event ? 7 : 30)));
    }

    public static String lifecycle(LocalDate start, LocalDate end, boolean cancelled, Instant now) {
        if (cancelled) return "CANCELLED";
        if (start == null || end == null) return "UNKNOWN";
        return end.isBefore(now.atZone(SEOUL).toLocalDate()) ? "ENDED" : "ACTIVE";
    }

    public static String blockingCode(String code) {
        return switch (code) {
            case "20", "22", "23", "30", "31" -> code;
            default -> null;
        };
    }
}
