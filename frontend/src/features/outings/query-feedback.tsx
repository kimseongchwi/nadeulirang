"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/feedback";
import { ReviewLink } from "@/providers/review-provider";
export function QueryFeedback({ status, message }: { status: number; message: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (pending) return <LoadingState />;
  if (status === 400) return <EmptyState title="검색 조건을 확인해 주세요." description={message}><ReviewLink href="/search" className="button secondary">초기화</ReviewLink></EmptyState>;
  return <ErrorState onRetry={() => startTransition(() => router.refresh())} />;
}
