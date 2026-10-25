import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarDateLabel, calendarToday, subscribeCalendarDate } from "../src/features/ui-design/calendar-date.ts";
import { validDate } from "../src/features/outings/model.ts";

function browserEvents(t, visibilityState = "visible") {
  const browser = new EventTarget();
  const page = new EventTarget();
  Object.defineProperty(page, "visibilityState", { value: visibilityState, configurable: true });
  for (const [key, value] of [["window", browser], ["document", page]]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }
  return { browser, page };
}

test("날짜 읽는 이름은 요일을 포함하고 서울 자정·윤일·연도 경계를 따른다", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-12-31T14:59:59Z") });
  assert.equal(calendarToday(), "2026-12-31");
  t.mock.timers.setTime(Date.parse("2026-12-31T15:00:00Z"));
  assert.equal(calendarToday(), "2027-01-01");
  assert.equal(calendarDateLabel("2028-02-29"), "2028년 2월 29일 화요일");
  assert.equal(calendarDateLabel("2027-01-01"), "2027년 1월 1일 금요일");
});

test("열린 화면의 서울 자정마다 갱신하고 과거 선택을 새 기준으로 거부한다", (t) => {
  const { browser, page } = browserEvents(t);
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: Date.parse("2026-12-31T14:59:59Z") });
  const selected = "2026-12-31";
  const dates = [];
  const unsubscribe = subscribeCalendarDate(() => dates.push(calendarToday()));
  t.after(unsubscribe);
  assert.equal(validDate(selected, calendarToday()), true);
  t.mock.timers.tick(1000);
  assert.deepEqual(dates, ["2027-01-01"]);
  assert.equal(validDate(selected, calendarToday()), false);
  t.mock.timers.tick(86400000);
  assert.deepEqual(dates, ["2027-01-01", "2027-01-02"]);
  unsubscribe();
  t.mock.timers.tick(86400000);
  browser.dispatchEvent(new Event("focus"));
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(dates.length, 2);
});

test("절전 뒤 포커스·화면 복귀·뒤로가기 복원 시 실제 날짜로 갱신하고 타이머를 재예약한다", (t) => {
  const { browser, page } = browserEvents(t, "hidden");
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: Date.parse("2028-02-28T14:00:00Z") });
  const dates = [];
  const unsubscribe = subscribeCalendarDate(() => dates.push(calendarToday()));
  t.after(unsubscribe);
  t.mock.timers.setTime(Date.parse("2028-02-29T15:00:00Z"));
  page.dispatchEvent(new Event("visibilitychange"));
  assert.deepEqual(dates, []);
  browser.dispatchEvent(new Event("focus"));
  assert.deepEqual(dates, ["2028-03-01"]);
  Object.defineProperty(page, "visibilityState", { value: "visible" });
  page.dispatchEvent(new Event("visibilitychange"));
  browser.dispatchEvent(new Event("pageshow"));
  assert.deepEqual(dates, ["2028-03-01", "2028-03-01", "2028-03-01"]);
  t.mock.timers.tick(86400000);
  assert.equal(dates.at(-1), "2028-03-02");
  assert.equal(dates.length, 4);
  unsubscribe();
});
