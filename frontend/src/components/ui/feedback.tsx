"use client";

import type { ReactNode } from "react";

type StatePlacement = "page" | "area";

function StateRegion({ placement, children }: { placement: StatePlacement; children: ReactNode }) {
  return <div className={`state-region state-region-${placement}`}>{children}</div>;
}

function StateArt({ type }: { type: "loading" | "empty" | "error" }) {
  if (type === "loading")
    return (
      <span className="state-art walking-scene" aria-hidden="true">
        <span className="people-mask walking-mark" />
        <span className="walking-shadow" />
      </span>
    );
  return (
    <span className={`state-art state-${type}`} aria-hidden="true">
      <svg
        width="48"
        height="48"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === "empty" ? (
          <>
            <path d="M8 29c-1-12 6-19 21-20 1 15-6 22-18 20Z" />
            <path d="m8 33 14-14M14 27l-1-7m5 3 7 1" />
            <path d="M30 30h4m-2-2v4" />
          </>
        ) : (
          <>
            <path d="M12 27a7 7 0 0 1-1-14 10 10 0 0 1 19 0 7 7 0 0 1-1 14" />
            <path d="M20 20v8m0 5h.01" />
          </>
        )}
      </svg>
    </span>
  );
}
export function LoadingState({ placement = "area" }: { placement?: StatePlacement }) {
  return (
    <StateRegion placement={placement}>
      <div
        className="loading state-feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <StateArt type="loading" />
        <span className="sr-only">나들이를 불러오고 있어요.</span>
      </div>
    </StateRegion>
  );
}
export function EmptyState({
  title,
  description,
  children,
  placement = "area",
}: {
  title: string;
  description: string;
  children?: ReactNode;
  placement?: StatePlacement;
}) {
  return (
    <StateRegion placement={placement}>
      <div className="empty state-feedback">
        <StateArt type="empty" />
        <strong className="state-title">{title}</strong>
        <p>{description}</p>
        {children}
      </div>
    </StateRegion>
  );
}
export function ErrorState({
  onRetry,
  sample = false,
  placement = "area",
}: {
  onRetry: () => void;
  sample?: boolean;
  placement?: StatePlacement;
}) {
  return (
    <StateRegion placement={placement}>
      <div
        className="feedback-error state-feedback"
        role={sample ? "group" : "alert"}
      >
        <StateArt type="error" />
        <strong className="state-title">나들이를 불러오지 못했어요.</strong>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button className="button secondary" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    </StateRegion>
  );
}
