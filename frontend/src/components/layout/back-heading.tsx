"use client";

import { Icon } from "@/components/ui/icons";
import { useNavigation } from "@/providers/navigation-provider";

export function BackHeading({
  title,
  labelOnly = false,
  compact = false,
  fallbackHref,
}: {
  title: string;
  labelOnly?: boolean;
  compact?: boolean;
  fallbackHref?: string;
}) {
  const { back } = useNavigation();
  const button = (
    <button
      type="button"
      className="back-heading-button"
      onClick={() => back(fallbackHref)}
      aria-label={`${title}, 이전 페이지로 돌아가기`}
    >
      <span className="back-heading-icon">
        <Icon name="back" />
      </span>
      <span>{title}</span>
    </button>
  );
  return (
    <div className={`page-head${compact ? " compact" : ""}`}>
      {labelOnly ? <p>{button}</p> : <h1 aria-label={title}>{button}</h1>}
    </div>
  );
}
