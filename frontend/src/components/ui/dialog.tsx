"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { Icon } from "@/components/ui/icons";

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
      if (!sheet || !dialog) return;
      const service = document
        .querySelector(".service")
        ?.getBoundingClientRect();
      const guide = !!document.querySelector(".review-root.guide-mode");
      const width = guide
        ? Math.min(390, window.innerWidth - 32)
        : service?.width || window.innerWidth;
      dialog.style.width = `${width}px`;
      dialog.style.left = `${guide ? (window.innerWidth - width) / 2 : service?.left || 0}px`;
    }
    const scroll = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    position();
    dialog.showModal();
    document.body.style.overflow = "hidden";
    window.scrollTo(0, scroll);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("resize", position);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, [open, sheet]);
  return (
    <dialog
      ref={dialogRef}
      id={id}
      className={className}
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
      <div className={sheet ? "policy-sheet-head" : "dialog-head"}>
        <h2 id={`${id}Title`}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={`${title === "메뉴" ? "메뉴" : title === "홈 필터" ? "홈 필터" : title === "방문 날짜 선택" ? "달력" : "정책 안내"} 닫기`}
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
