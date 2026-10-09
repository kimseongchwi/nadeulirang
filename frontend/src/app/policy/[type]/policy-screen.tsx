"use client";

import { policyTitles, type PolicyType } from "@/features/policies/model";
import { BackHeading } from "@/components/layout/back-heading";
import { PolicyContent } from "@/features/policies/policy-content";

export function PolicyScreen({ type, samplePhoto }: { type: PolicyType; samplePhoto?: boolean }) {
  return (
    <>
      <BackHeading title={policyTitles[type]} />
      <PolicyContent type={type} samplePhoto={samplePhoto} />
    </>
  );
}
