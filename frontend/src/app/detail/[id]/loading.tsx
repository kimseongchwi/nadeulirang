"use client";

import { LoadingState } from "@/components/ui/feedback";
import { useNavigation } from "@/providers/navigation-provider";

export default function DetailLoading() {
  const { pending } = useNavigation();
  return pending ? null : <LoadingState placement="page" />;
}
