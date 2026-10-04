"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { addDays, dateLabel, validDate } from "@/features/outings/model";
import { ReviewDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { useReview } from "@/providers/review-provider";

function Calendar({
  value,
  onApply,
  onClose,
}: {
  value: string;
  onApply: (value: string) => void;
  onClose: () => void;
}) {
  const { today } = useReview();
  const minimumYear = Number(today.slice(0, 4));
  const initial = validDate(value, today) ? value : today;
  const [pending, setPending] = useState(value);
  const [focusDate, setFocusDate] = useState(initial);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [yearsView, setYearsView] = useState(false);
  const [yearStart, setYearStart] = useState(minimumYear);
  const [focusTarget, setFocusTarget] = useState(`calendar-day-${initial}`);
  useEffect(() => {
    document.getElementById(focusTarget)?.focus({ preventScroll: true });
  }, [focusTarget]);
  const year = Number(month.slice(0, 4)),
    monthNumber = Number(month.slice(5));
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from(
    { length: new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() },
    () => null,
  );
  for (let day = 1; day <= length; day++)
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
  function changeMonth(next: string, focusGrid = false) {
    const bounded =
      next < today.slice(0, 7)
        ? today.slice(0, 7)
        : next > "9999-12"
          ? "9999-12"
          : next;
    const day = Math.min(
      Number(focusDate.slice(8)),
      new Date(
        Date.UTC(Number(bounded.slice(0, 4)), Number(bounded.slice(5)), 0),
      ).getUTCDate(),
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
    if (date.getUTCFullYear() > 9999 || date.getUTCFullYear() < minimumYear)
      return;
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
  return (
    <ReviewDialog
      id="calendarDialog"
      open
      title="방문 날짜 선택"
      className="calendar-dialog"
      onClose={onClose}
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
                setYearStart(
                  minimumYear + Math.floor((year - minimumYear) / 12) * 12,
                );
                setYearsView(true);
                setFocusTarget(`calendar-year-${year}`);
              }}
            >
              <span>
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
          <div className="weekdays" aria-hidden="true">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div
            className="calendar-grid"
            role="grid"
            aria-label="날짜"
            aria-describedby="calendarKeys"
            onKeyDown={gridKey}
          >
            {rows.map((row, rowIndex) => (
              <div role="row" key={rowIndex}>
                {row.map((date, index) =>
                  date ? (
                    <button
                      type="button"
                      role="gridcell"
                      id={`calendar-day-${date}`}
                      key={date}
                      data-day={date}
                      tabIndex={date === focusDate ? 0 : -1}
                      aria-label={`${year}년 ${monthNumber}월 ${Number(date.slice(8))}일${date === today ? ", 오늘" : ""}`}
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
                      <span className="day-number">
                        {Number(date.slice(8))}
                      </span>
                      {date === today && (
                        <span className="today-label" aria-hidden="true">
                          오늘
                        </span>
                      )}
                    </button>
                  ) : (
                    <span role="gridcell" key={`blank-${index}`} />
                  ),
                )}
              </div>
            ))}
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
              onClick={() =>
                setYearStart(Math.max(minimumYear, yearStart - 12))
              }
            >
              <Icon name="back" />
            </button>
            <span aria-live="polite">
              {yearStart} – {yearEnd}
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
                Math.min(
                  9999,
                  Number(event.target.dataset.year) + offsets[event.key],
                ),
              );
              if (next < yearStart || next > yearEnd)
                setYearStart(
                  minimumYear + Math.floor((next - minimumYear) / 12) * 12,
                );
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
        </>
      )}
      <p id="calendarKeys" className="sr-only">
        방향키로 이동, Enter로 선택, Page Up과 Page Down으로 월 이동, Escape로
        취소합니다.
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
          <button className="button secondary" onClick={onClose}>
            취소
          </button>
          <button
            className="button primary"
            disabled={!pending && !value}
            onClick={() => {
              if (!pending || validDate(pending, today)) {
                onApply(pending);
                onClose();
              }
            }}
          >
            선택 완료
          </button>
        </div>
      </div>
    </ReviewDialog>
  );
}
export function DateField() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <>
      <div>
        <span className="field-label" id="guideDateLabel">
          방문 날짜
        </span>
        <div className="date-control">
          <button
            type="button"
            className="date-trigger"
            aria-labelledby="guideDateLabel guideDateValue"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span id="guideDateValue">{dateLabel(value)}</span>
            <Icon name="calendar" />
          </button>
          {value && (
            <button
              type="button"
              className="icon-button date-clear"
              aria-label="날짜 지우기"
              onClick={() => setValue("")}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      </div>
      {open && (
        <Calendar
          value={value}
          onApply={setValue}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
