"use client";

import { ReviewDialog } from "@/components/ui/dialog";
import { policyTitles, type PolicyType } from "@/features/policies/model";
import { PolicyContent } from "@/features/policies/policy-content";
import { useReview } from "@/providers/review-provider";

export function PolicySheet({ type, open }: { type: PolicyType; open: boolean }) {
  const { closeSheet, pathname } = useReview();
  return (
    <ReviewDialog
      id={`policyDialog-${type}`}
      title={policyTitles[type]}
      open={open}
      onClose={closeSheet}
      sheet
      className="policy-sheet"
    >
      <div
        className="policy-sheet-body"
        tabIndex={0}
        aria-label="정책 안내 내용"
      >
        <PolicyContent type={type} samplePhoto={pathname === "/ui-design"} />
      </div>
    </ReviewDialog>
  );
}
