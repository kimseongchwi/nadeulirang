"use client";

import { badgeInfo, type Outing } from "./model";
import { useNavigation } from "@/providers/navigation-provider";

export function Badge({ item }: { item: Outing }) {
  const { today, upcomingDays } = useNavigation();
  const badge = badgeInfo(item, today, upcomingDays);
  return <span className={`badge ${badge.className}`}>{badge.text}</span>;
}
