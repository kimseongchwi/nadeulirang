import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  normalizedFilters,
  publicItems,
  searchItems,
  seoulDate,
  upcoming,
  validDate,
  reviewItems,
} from "../src/features/outings/model.ts";

test("서울 자정 경계에서 날짜가 바뀌고 윤년의 실제 날짜만 허용한다", () => {
  assert.equal(seoulDate(new Date("2026-10-03T14:59:59Z")), "2026-10-03");
  assert.equal(seoulDate(new Date("2026-10-03T15:00:00Z")), "2026-10-04");
  assert.equal(validDate("2028-02-29", "2028-02-28"), true);
  assert.equal(validDate("2027-02-29", "2027-02-28"), false);
  assert.equal(validDate("2026-10-03", "2026-10-04"), false);
  assert.equal(addDays("2028-02-28", 2), "2028-03-01");
});
test("행사 종료일까지 공개하고 지난 회차는 검색에서 제외한다", () => {
  const festival = reviewItems.find((item) => item.name === "강경젓갈축제");
  assert.ok(festival);
  assert.equal(
    publicItems("2026-10-18").some((item) => item.id === festival.id),
    true,
  );
  assert.equal(
    publicItems("2026-10-19").some((item) => item.id === festival.id),
    false,
  );
  assert.equal(
    searchItems(new URLSearchParams("q=우리동네"), "2026-10-04", 14).length,
    0,
  );
  assert.equal(upcoming(festival, "2026-10-04", 7), false);
  assert.equal(upcoming(festival, "2026-10-04", 14), true);
});
test("홈과 검색의 조건을 구분하고 잘못된 값이나 보류된 필터를 제거한다", () => {
  const params = new URLSearchParams(
    "q=경복궁&region=서울특별시&kind=CULTURAL_SITE&scope=permanent&date=2026-10-05&fee=free",
  );
  assert.equal(
    searchItems(normalizedFilters(params, "2026-10-04"), "2026-10-04", 14)[0]
      ?.name,
    "경복궁",
  );
  assert.deepEqual(
    [...normalizedFilters(params, "2026-10-04", true).keys()],
    ["region", "kind"],
  );
  assert.equal(
    normalizedFilters(
      new URLSearchParams("region=없는지역&kind=UNKNOWN&scope=unknown"),
      "2026-10-04",
    ).size,
    0,
  );
  assert.equal(
    searchItems(new URLSearchParams("region=서울특별시"), "2026-10-04", 14)
      .length,
    2,
  );
});
