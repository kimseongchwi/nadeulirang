"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { addDays, dateLabel, validDate } from "@/features/outings/model";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { useNavigation } from "@/providers/navigation-provider";
import { calendarDateLabel, calendarToday, subscribeCalendarDate } from "./calendar-date";

function Calendar({
  value,
  today,
  onApply,
  onClose,
}: {
  value: string;
  today: string;
  onApply: (value: string) => void;
  onClose: () => void;
}) {
  const minimumYear = Number(today.slice(0, 4));
  const initial = validDate(value, today) ? value : today;
  const [pending, setPending] = useState(value);
  const [focusedDate, setFocusDate] = useState(initial);
  const focusDate = focusedDate < today ? today : focusedDate;
  const [viewedMonth, setMonth] = useState(initial.slice(0, 7));
  const month = viewedMonth < today.slice(0, 7) ? today.slice(0, 7) : viewedMonth;
  const [yearsView, setYearsView] = useState(false);
  const [viewedYearStart, setYearStart] = useState(minimumYear);
  const yearStart = Math.max(minimumYear, viewedYearStart);
  const [focusTarget, setFocusTarget] = useState(`calendar-day-${initial}`);
  const previousToday = useRef(today);
  const lastFocusedOption = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dateChanged = previousToday.current !== today;
    previousToday.current = today;
    let targetId = focusTarget;
    if (dateChanged) {
      const active = document.activeElement;
      if (active?.matches("[data-day], [data-year]")) targetId = active.id;
      else if (
        active === document.body &&
        lastFocusedOption.current &&
        !lastFocusedOption.current.isConnected
      )
        targetId = lastFocusedOption.current.id;
      else return;
    }
    if (targetId.startsWith("calendar-day-") && targetId.slice("calendar-day-".length) < today)
      targetId = `calendar-day-${today}`;
    if (
      targetId.startsWith("calendar-year-") &&
      Number(targetId.slice("calendar-year-".length)) < Number(today.slice(0, 4))
    )
      targetId = `calendar-year-${today.slice(0, 4)}`;
    const target = document.getElementById(targetId);
    target?.focus({ preventScroll: true });
    const scroll = target?.closest<HTMLElement>(".calendar-scroll");
    if (!target || !scroll) return;
    const targetRect = target.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();
    if (targetRect.top < scrollRect.top) scroll.scrollTop += targetRect.top - scrollRect.top;
    else if (targetRect.bottom > scrollRect.bottom)
      scroll.scrollTop += targetRect.bottom - scrollRect.bottom;
  }, [focusTarget, today]);
  const year = Number(month.slice(0, 4)),
    monthNumber = Number(month.slice(5));
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from(
    { length: new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() },
    () => null,
  );
  for (let day = 1; day <= length; day++) cells.push(`${month}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
  function changeMonth(next: string, focusGrid = false) {
    const bounded =
      next < today.slice(0, 7) ? today.slice(0, 7) : next > "9999-12" ? "9999-12" : next;
    const day = Math.min(
      Number(focusDate.slice(8)),
      new Date(Date.UTC(Number(bounded.slice(0, 4)), Number(bounded.slice(5)), 0)).getUTCDate(),
    );
    let focus = `${bounded}-${String(day).padStart(2, "0")}`;
    if (focus < today) focus = today;
    setMonth(bounded);
    setFocusDate(focus);
    setYearsView(false);
    if (focusGrid) setFocusTarget(`calendar-day-${focus}`);
  }
  function moveMonth(step: number, focusGrid = false) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + step);
    if (date.getUTCFullYear() > 9999 || date.getUTCFullYear() < minimumYear) return;
    changeMonth(date.toISOString().slice(0, 7), focusGrid);
  }
  function gridKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveMonth(event.key === "PageUp" ? -1 : 1, true);
      return;
    }
    const weekday = new Date(`${focusDate}T12:00:00Z`).getUTCDay();
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    };
    if (!Object.hasOwn(offsets, event.key)) return;
    event.preventDefault();
    let next = addDays(focusDate, offsets[event.key]);
    if (next < today) next = today;
    if (!/^\d{4}-/.test(next) || next > "9999-12-31") next = "9999-12-31";
    setFocusDate(next);
    setMonth(next.slice(0, 7));
    setFocusTarget(`calendar-day-${next}`);
  }
  const yearEnd = Math.min(yearStart + 11, 9999);
  const expired = !!pending && !validDate(pending, today);
  return (
    <Dialog
      id="calendarDialog"
      open
      title="방문 날짜 선택"
      className="calendar-dialog"
      viewportInset={0}
      onClose={onClose}
    >
      <div
        className="calendar-body"
        onFocusCapture={(event) => {
          lastFocusedOption.current = event.target.matches("[data-day], [data-year]")
            ? event.target
            : null;
        }}
        onBlurCapture={(event) => {
          const next = event.relatedTarget;
          if (
            next instanceof HTMLElement &&
            next !== document.body &&
            !next.matches("[data-day], [data-year]")
          )
            lastFocusedOption.current = null;
        }}
      >
        {!yearsView ? (
          <>
            <div className="month-nav">
              <button
                className="icon-button"
                aria-label="이전 달"
                disabled={month <= today.slice(0, 7)}
                onClick={() => moveMonth(-1)}
              >
                <Icon name="back" />
              </button>
              <button
                id="monthLabel"
                className="month-label"
                aria-label={`연도 선택, ${year}년 ${monthNumber}월`}
                aria-expanded={false}
                onClick={() => {
                  setYearStart(minimumYear + Math.floor((year - minimumYear) / 12) * 12);
                  setYearsView(true);
                  setFocusTarget(`calendar-year-${year}`);
                }}
              >
                <span
                  id="calendarMonthTitle"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {year}년 {monthNumber}월
                </span>
                <Icon name="down" />
              </button>
              <button
                className="icon-button"
                aria-label="다음 달"
                disabled={month >= "9999-12"}
                onClick={() => moveMonth(1)}
              >
                <Icon name="next" />
              </button>
            </div>
            <div
              className="weekdays"
              aria-hidden="true"
            >
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-scroll">
              <div
                className="calendar-grid"
                role="grid"
                aria-labelledby="calendarMonthTitle"
                aria-describedby="calendarKeys"
                onKeyDown={gridKey}
              >
                {rows.map((row, rowIndex) => (
                  <div
                    role="row"
                    key={rowIndex}
                  >
                    {row.map((date, index) =>
                      date ? (
                        <button
                          type="button"
                          role="gridcell"
                          id={`calendar-day-${date}`}
                          key={date}
                          data-day={date}
                          tabIndex={date === focusDate ? 0 : -1}
                          aria-label={`${calendarDateLabel(date)}${date === today ? ", 오늘" : ""}`}
                          aria-current={date === today ? "date" : undefined}
                          className={date === today ? "today" : undefined}
                          aria-selected={date === pending}
                          disabled={date < today}
                          onClick={() => {
                            setPending(date);
                            setFocusDate(date);
                            setFocusTarget(`calendar-day-${date}`);
                          }}
                        >
                          <span>{Number(date.slice(8))}</span>
                        </button>
                      ) : (
                        <span
                          role="gridcell"
                          key={`blank-${index}`}
                        />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="year-head">
              <button
                className="icon-button"
                aria-label="날짜 달력으로 돌아가기"
                onClick={() => {
                  setYearsView(false);
                  setFocusTarget("monthLabel");
                }}
              >
                <Icon name="back" />
              </button>
              <h3>연도 선택</h3>
            </div>
            <div className="month-nav">
              <button
                className="icon-button"
                aria-label="이전 연도 묶음"
                disabled={yearStart <= minimumYear}
                onClick={() => setYearStart(Math.max(minimumYear, yearStart - 12))}
              >
                <Icon name="back" />
              </button>
              <span
                aria-live="polite"
                aria-atomic="true"
              >
                {yearStart}년 – {yearEnd}년
              </span>
              <button
                className="icon-button"
                aria-label="다음 연도 묶음"
                disabled={yearEnd === 9999}
                onClick={() => setYearStart(Math.min(9999, yearStart + 12))}
              >
                <Icon name="next" />
              </button>
            </div>
            <div className="calendar-scroll">
              <div
                className="year-grid"
                role="group"
                aria-label="연도"
                onKeyDown={(event) => {
                  const offsets: Record<string, number> = {
                    ArrowLeft: -1,
                    ArrowRight: 1,
                    ArrowUp: -3,
                    ArrowDown: 3,
                  };
                  if (
                    !Object.hasOwn(offsets, event.key) ||
                    !(event.target instanceof HTMLButtonElement)
                  )
                    return;
                  event.preventDefault();
                  const next = Math.max(
                    minimumYear,
                    Math.min(9999, Number(event.target.dataset.year) + offsets[event.key]),
                  );
                  if (next < yearStart || next > yearEnd)
                    setYearStart(minimumYear + Math.floor((next - minimumYear) / 12) * 12);
                  setFocusTarget(`calendar-year-${next}`);
                }}
              >
                {Array.from(
                  { length: yearEnd - yearStart + 1 },
                  (_, index) => yearStart + index,
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    id={`calendar-year-${value}`}
                    data-year={value}
                    className="year-option"
                    aria-current={value === year ? "true" : undefined}
                    onClick={() => changeMonth(`${value}${month.slice(4)}`, true)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <p
        id="calendarKeys"
        className="sr-only"
      >
        방향키로 이동, Enter로 선택, Page Up과 Page Down으로 월 이동, Escape로 취소합니다.
      </p>
      <p
        id="calendarStatus"
        className={expired ? "calendar-message" : "sr-only"}
        role="status"
        aria-atomic="true"
      >
        {expired
          ? "선택한 날짜가 오늘 이전입니다. 오늘 이후 날짜를 다시 선택하거나 지워 주세요."
          : pending
            ? `${calendarDateLabel(pending)} 임시 선택. 선택 완료를 눌러 반영하세요.`
            : value
              ? "임시 선택을 지웠습니다. 선택 완료를 눌러 반영하세요."
              : "선택한 날짜가 없습니다. 날짜를 선택하세요."}
      </p>
      <div className="calendar-actions">
        <button
          className="text-button"
          disabled={!pending}
          onClick={() => setPending("")}
        >
          지우기
        </button>
        <div className="calendar-actions-right">
          <button
            className="button secondary"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="button primary"
            disabled={expired || (!pending && !value)}
            onClick={() => {
              if (!pending || validDate(pending, calendarToday())) {
                onApply(pending);
                onClose();
              }
            }}
          >
            선택 완료
          </button>
        </div>
      </div>
    </Dialog>
  );
}
export function DateField() {
  const { today: serverToday } = useNavigation();
  const today = useSyncExternalStore(subscribeCalendarDate, calendarToday, () => serverToday);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const expired = !!value && !validDate(value, today);
  const [announcement, setAnnouncement] = useState("");
  return (
    <>
      <div>
        <span
          className="field-label"
          id="guideDateLabel"
        >
          방문 날짜
        </span>
        <div className="date-control">
          <button
            type="button"
            className="date-trigger"
            ref={trigger}
            aria-label={`방문 날짜 ${value ? calendarDateLabel(value) : "미선택"}, 달력 열기`}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-describedby={expired ? "guideDateStatus" : undefined}
            onClick={() => setOpen(true)}
          >
            <span id="guideDateValue">{dateLabel(value)}</span>
          </button>
          {value && (
            <button
              type="button"
              className="icon-button date-clear"
              aria-label="날짜 지우기"
              onClick={() => {
                setValue("");
                setAnnouncement("방문 날짜를 지웠습니다.");
                trigger.current?.focus();
              }}
            >
              <Icon name="close" />
            </button>
          )}
          <button
            type="button"
            className="icon-button date-calendar"
            aria-label="방문 날짜 달력 열기"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon name="calendar" />
          </button>
        </div>
        <p
          id="guideDateStatus"
          className={expired ? "date-message" : "sr-only"}
          role="status"
          aria-atomic="true"
        >
          {expired
            ? "선택한 날짜가 오늘 이전입니다. 날짜를 다시 선택하거나 지워 주세요."
            : announcement}
        </p>
      </div>
      {open && (
        <Calendar
          value={value}
          today={today}
          onApply={(next) => {
            setValue(next);
            setAnnouncement(
              next ? `${calendarDateLabel(next)} 선택했습니다.` : "방문 날짜를 지웠습니다.",
            );
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
