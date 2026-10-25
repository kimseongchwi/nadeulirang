"use client";

import { badgeInfo, type Outing } from "./model";
import { useNavigation } from "@/providers/navigation-provider";

export function Badge({ item }: { item: Outing }) {
  const { today } = useNavigation();
  const badge = badgeInfo(item, today, 14);
  return <span className={`badge ${badge.className}`}>{badge.text}</span>;
}
