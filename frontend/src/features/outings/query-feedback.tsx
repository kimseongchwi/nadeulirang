"use client";
import { ErrorState, EmptyState } from "@/components/ui/feedback";
import { ReviewLink, useReview } from "@/providers/review-provider";
export function QueryFeedback({ status, message }: { status: number; message: string }) {
  const { refresh } = useReview();
  if (status === 400) return <EmptyState title="검색 조건을 확인해 주세요." description={message}><ReviewLink href="/search" className="button secondary">초기화</ReviewLink></EmptyState>;
  return <ErrorState onRetry={refresh} />;
}
