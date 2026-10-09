"use client";

import { useSearchParams } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { policyTitles, type PolicyType } from "@/features/policies/model";
import { PolicyContent } from "@/features/policies/policy-content";
import { useNavigation } from "@/providers/navigation-provider";

export function PolicySheet({ type, open }: { type: PolicyType; open: boolean }) {
  const { closeSheet, pathname } = useNavigation();
  const query = useSearchParams();
  return (
    <Dialog
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
        <PolicyContent type={type} samplePhoto={pathname === "/ui-design" || pathname === "/policy/about" && query.get("sample") === "clayarch"} />
      </div>
    </Dialog>
  );
}
