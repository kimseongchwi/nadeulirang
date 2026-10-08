import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  seoulDate,
  validDate,
} from "../src/features/outings/model.ts";

test("서울 자정 경계에서 날짜가 바뀌고 윤년의 실제 날짜만 허용한다", () => {
  assert.equal(seoulDate(new Date("2026-10-03T14:59:59Z")), "2026-10-03");
  assert.equal(seoulDate(new Date("2026-10-03T15:00:00Z")), "2026-10-04");
  assert.equal(validDate("2028-02-29", "2028-02-28"), true);
  assert.equal(validDate("2027-02-29", "2027-02-28"), false);
  assert.equal(validDate("2026-10-03", "2026-10-04"), false);
  assert.equal(addDays("2028-02-28", 2), "2028-03-01");
});
