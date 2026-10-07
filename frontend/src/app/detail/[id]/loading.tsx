"use client";

import { LoadingState } from "@/components/ui/feedback";
import { useReview } from "@/providers/review-provider";

export default function DetailLoading() {
  const { pending } = useReview();
  return pending ? null : <LoadingState />;
}
