"use client";

import { Icon } from "@/components/ui/icons";
import { useReview } from "@/providers/review-provider";

export function BackHeading({ title, labelOnly = false }: { title: string; labelOnly?: boolean }) {
  const { back } = useReview();
  return (
    <div className="page-head">
      <button
        className="icon-button"
        onClick={back}
        aria-label="이전 페이지로 돌아가기"
      >
        <Icon name="back" />
      </button>
      {labelOnly ? <p>{title}</p> : <h1>{title}</h1>}
    </div>
  );
}
