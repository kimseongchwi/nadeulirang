"use client";

import { badgeInfo, type Outing } from "./model";
import { useReview } from "@/providers/review-provider";

export function Badge({ item }: { item: Outing }) {
  const { today, upcomingDays } = useReview();
  const badge = badgeInfo(item, today, upcomingDays);
  return <span className={`badge ${badge.className}`}>{badge.text}</span>;
}
