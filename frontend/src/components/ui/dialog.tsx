"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { Icon } from "@/components/ui/icons";
import {
  reviewScrollTop,
  scrollReviewTo,
  serviceScrollContainer,
} from "@/components/layout/service-scroll";

export function ReviewDialog({
  open,
  onClose,
  title,
  id,
  className = "",
  sheet = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  id: string;
  className?: string;
  sheet?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const origin =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    function position() {
      if (!dialog) return;
      const service = document
        .querySelector(".service")
        ?.getBoundingClientRect();
      const guide = !!document.querySelector(".review-root.guide-mode");
      const left = guide ? 0 : Math.max(0, service?.left || 0);
      const right = guide
        ? window.innerWidth
        : Math.min(window.innerWidth, service?.right || window.innerWidth);
      const top = guide ? 0 : Math.max(0, service?.top || 0);
      const bottom = guide
        ? window.innerHeight
        : Math.min(window.innerHeight, service?.bottom || window.innerHeight);
      const width = sheet
        ? guide
          ? Math.min(390, right - left - 32)
          : right - left
        : right - left - 32;
      dialog.style.width = `${width}px`;
      dialog.style.margin = "0";
      dialog.style.left = `${sheet ? left + (right - left - width) / 2 : (left + right) / 2}px`;
      dialog.style.top = sheet ? "auto" : `${(top + bottom) / 2}px`;
      dialog.style.bottom = sheet ? `${window.innerHeight - bottom}px` : "auto";
      dialog.style.transform = sheet ? "none" : "translate(-50%, -50%)";
      dialog.style.maxHeight = `${sheet ? (bottom - top) * 0.85 : bottom - top - 32}px`;
      dialog.style.setProperty(
        "--dialog-backdrop-inset",
        `${top}px ${window.innerWidth - right}px ${window.innerHeight - bottom}px ${left}px`,
      );
    }
    const scroll = reviewScrollTop();
    const container = serviceScrollContainer();
    const previousContainerOverflow = container?.style.overflowY || "";
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    position();
    scrollReviewTo(scroll);
    if (container) container.style.overflowY = "hidden";
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("resize", position);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (container) container.style.overflowY = previousContainerOverflow;
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, [open, sheet]);
  return (
    <dialog
      ref={dialogRef}
      id={id}
      className={className}
      data-sheet={sheet || undefined}
      aria-labelledby={`${id}Title`}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          closeRef.current();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],select,input:not(:disabled),[tabindex="0"]',
          ),
        ];
        const first = targets[0],
          last = targets.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      {sheet && <div className="sheet-handle" aria-hidden="true" />}
      <div className={sheet ? "policy-sheet-head" : "dialog-head"}>
        <h2 id={`${id}Title`} className="review-dialog-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={`${title === "메뉴" ? "메뉴" : title === "홈 필터" ? "홈 필터" : title === "방문 날짜 선택" ? "달력" : title === "간단 보기" ? "간단 보기" : "정책 안내"} 닫기`}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export type ReviewStyle = CSSProperties & {
  [key: `--${string}`]: string | number;
};
