import { addDays, seoulDate } from "../outings/model.ts";

export function calendarToday() {
  return seoulDate();
}

export function calendarDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${value}T00:00:00+09:00`));
}

export function subscribeCalendarDate(listener: () => void) {
  const browser = window;
  const page = document;
  let timer: ReturnType<typeof setTimeout>;
  function schedule() {
    clearTimeout(timer);
    const now = new Date();
    const midnight = new Date(`${addDays(seoulDate(now), 1)}T00:00:00+09:00`);
    timer = setTimeout(refresh, midnight.getTime() - now.getTime());
  }
  function refresh() {
    listener();
    schedule();
  }
  function onVisibilityChange() {
    if (page.visibilityState === "visible") refresh();
  }
  schedule();
  browser.addEventListener("focus", refresh);
  browser.addEventListener("pageshow", refresh);
  page.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    clearTimeout(timer);
    browser.removeEventListener("focus", refresh);
    browser.removeEventListener("pageshow", refresh);
    page.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
