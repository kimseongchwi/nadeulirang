package kr.nadeulirang.backend.outing;

import java.time.Clock;
import java.util.UUID;
import java.util.Set;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outings")
public class OutingController {
    private final OutingStore store;
    private final Clock clock;

    public OutingController(OutingStore store, Clock clock) { this.store = store; this.clock = clock; }

    @GetMapping
    public OutingResponse.Page list(@RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "") String region, @RequestParam(defaultValue = "") String kind,
            @RequestParam(defaultValue = "ALL") String period, @RequestParam(defaultValue = "DEFAULT") String sort,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "0") int days,
            @RequestParam MultiValueMap<String, String> parameters) {
        var supported = Set.of("keyword", "region", "kind", "period", "sort", "page", "days");
        if (parameters.entrySet().stream().anyMatch(e -> !supported.contains(e.getKey()) || e.getValue().size() != 1)) {
            throw new IllegalArgumentException("지원하지 않거나 중복된 검색 조건입니다.");
        }
        return store.list(new OutingQuery(keyword, region, kind, period, sort, page, days), clock.instant());
    }

    @GetMapping("/home")
    public OutingResponse.Home home(@RequestParam(defaultValue = "") String region,
            @RequestParam(defaultValue = "") String kind, @RequestParam(defaultValue = "14") int days,
            @RequestParam MultiValueMap<String, String> parameters) {
        if (!Set.of(7, 14, 30).contains(days) || parameters.entrySet().stream()
                .anyMatch(e -> !Set.of("region", "kind", "days").contains(e.getKey()) || e.getValue().size() != 1)) {
            throw new IllegalArgumentException("홈 검색 조건을 확인하세요.");
        }
        return store.home(region, kind, days, clock.instant());
    }

    @GetMapping("/options")
    public OutingResponse.Options options() { return store.options(clock.instant()); }

    @GetMapping("/{id}")
    public OutingResponse.Detail detail(@PathVariable UUID id) { return store.detail(id, clock.instant()); }
}
