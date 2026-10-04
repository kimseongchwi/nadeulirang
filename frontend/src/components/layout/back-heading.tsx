"use client";

import { Icon } from "@/components/ui/icons";
import { useReview } from "@/providers/review-provider";

export function BackHeading({ title }: { title: string }) {
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
      <h1>{title}</h1>
    </div>
  );
}
