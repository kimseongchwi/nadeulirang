"use client";

import { ReviewDialog } from "@/components/ui/dialog";
import { policyTitles, type PolicyType } from "@/features/policies/model";
import { PolicyContent } from "@/features/policies/policy-content";
import { useReview } from "@/providers/review-provider";

export function PolicySheet({ type }: { type: PolicyType }) {
  const { closeSheet } = useReview();
  return (
    <ReviewDialog
      id="policyDialog"
      title={policyTitles[type]}
      open
      onClose={closeSheet}
      sheet
      className="policy-sheet"
    >
      <div
        className="policy-sheet-body"
        tabIndex={0}
        aria-label="정책 안내 내용"
      >
        <PolicyContent type={type} />
      </div>
    </ReviewDialog>
  );
}
