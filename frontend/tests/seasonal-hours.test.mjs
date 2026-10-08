import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSeasonalHours } from "../src/features/outings/seasonal-hours.ts";
import { hoursInformation } from "../src/features/outings/detail-information.ts";

test("붙어 있는 계절 구분을 줄로 나누고 공연 시각을 보존한다", () => {
  const value = "- 하절기(3월~9월) 20:00, 22:00- 동절기(10월~2월) 19:00, 21:00";
  const formatted = "하절기(3월~9월): 20:00, 22:00\n동절기(10월~2월): 19:00, 21:00";
  assert.equal(formatSeasonalHours(value), formatted);
  assert.equal(formatSeasonalHours(formatted), formatted);
  const entry = { observationId: "공연 시간", field: "playtime", value };
  assert.deepEqual(hoursInformation([entry]), [{ label: "", value: formatted }]);
  assert.equal(entry.value, value);
});

test("계절 안내의 공백·대시 종류를 정리하고 시각 범위와 다른 문장은 보존한다", () => {
  assert.equal(formatSeasonalHours("하절기 (3월~9월): 20:00 – 동절기 (10월~2월): 19:00"),
    "하절기(3월~9월): 20:00\n동절기(10월~2월): 19:00");
  for (const value of ["09:30-17:30", "화~금 9:30 - 17:30 (입장 마감 17:00)", "휴일 - 공연 없음", "동절기 휴무", "051-610-6518"])
    assert.equal(formatSeasonalHours(value), value);
});
