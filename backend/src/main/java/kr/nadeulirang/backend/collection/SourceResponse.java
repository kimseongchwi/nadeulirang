package kr.nadeulirang.backend.collection;

import java.util.ArrayList;
import java.util.List;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public record SourceResponse(String outcome, String code, JsonNode payload, List<JsonNode> rows) {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    public static SourceResponse parse(Source source, int status, String body, String key) {
        // 오류 본문은 인증키나 민감한 진단 내용이 있을 수 있어 저장하지 않는다.
        try {
            String safe = redact(body, key);
            JsonNode root = sanitize(JSON.readTree(safe), key);
            JsonNode response = root.has("response") ? root.path("response") : root;
            JsonNode header = response.has("header") ? response.path("header")
                    : root.has("OpenAPI_ServiceResponse") ? root.path("OpenAPI_ServiceResponse").path("cmmMsgHeader") : response;
            String code = header.path("resultCode").asText(header.path("returnReasonCode").asText(""));
            if (status < 200 || status >= 300) return failed(code);
            if (source != Source.TOUR && code.equals("03")) return new SourceResponse("EMPTY", code, null, List.of());
            if (!code.equals(source == Source.TOUR ? "0000" : "00")) return failed(code);
            JsonNode count = response.path("body").path("totalCount");
            if (!count.asText().matches("[0-9]{1,9}")) return failed("INVALID_BODY");
            int total = Integer.parseInt(count.asText());
            JsonNode items = response.path("body").path("items");
            JsonNode item = items.isArray() ? items : items.path("item");
            List<JsonNode> rows = new ArrayList<>();
            if (item.isArray()) item.forEach(rows::add);
            else if (item.isObject()) rows.add(item);
            else if (!(item.isMissingNode() || item.isNull() || item.isTextual() && item.asText().isEmpty())) return failed("INVALID_BODY");
            boolean emptyShape = items.isNull() || items.isMissingNode() || items.isTextual() && items.asText().isEmpty();
            if (rows.stream().anyMatch(row -> !row.isObject()) || rows.size() > 20 || rows.size() > total
                    || rows.isEmpty() && total > 0 && emptyShape
                    || !items.isArray() && !items.isObject() && !emptyShape
                    || items.isObject() && !items.has("item")) return failed("INVALID_BODY");
            return new SourceResponse(rows.isEmpty() ? "EMPTY" : "SUCCESS", code, root, List.copyOf(rows));
        } catch (RuntimeException e) {
            // JSON 요청에도 XML 인증·한도 오류가 올 수 있다. 오류 코드는 읽되 원문은 남기지 않는다.
            var matcher = java.util.regex.Pattern.compile("<(?:resultCode|returnReasonCode)>([0-9]{2})</(?:resultCode|returnReasonCode)>").matcher(body);
            return failed(matcher.find() ? matcher.group(1) : "INVALID_BODY");
        }
    }

    public static SourceResponse failed(String code) {
        // 임의의 서버 메시지나 키를 결과 코드로 저장하지 않는다.
        return new SourceResponse("FAILED", code.matches("[A-Z0-9_]{0,40}") ? code : "SOURCE_ERROR", null, List.of());
    }

    private static String redact(String body, String key) {
        if (key != null && !key.isEmpty()) {
            String encoded = java.net.URLEncoder.encode(key, java.nio.charset.StandardCharsets.UTF_8);
            body = body.replace(java.net.URLEncoder.encode(encoded, java.nio.charset.StandardCharsets.UTF_8), "[KEY]")
                    .replace(encoded, "[KEY]").replace(key, "[KEY]");
        }
        return body.replaceAll("(?i)serviceKey[=:%\\s]+[^&\\s<>\"']+", "serviceKey=[KEY]");
    }

    private static JsonNode sanitize(JsonNode node, String key) {
        if (node.isTextual()) return JSON.getNodeFactory().stringNode(redact(node.asText(), key));
        if (node.isObject()) {
            var safe = JSON.createObjectNode();
            for (var field : node.properties()) safe.set(redact(field.getKey(), key), sanitize(field.getValue(), key));
            return safe;
        }
        if (node.isArray()) {
            var safe = JSON.createArrayNode();
            node.forEach(value -> safe.add(sanitize(value, key)));
            return safe;
        }
        return node;
    }
}
