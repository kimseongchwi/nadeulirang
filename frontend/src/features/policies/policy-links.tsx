"use client";

import { policyTitles } from "@/features/policies/model";
import { useReview } from "@/providers/review-provider";

export function PolicyLinks({ buttons = false }: { buttons?: boolean }) {
  const { openSheet } = useReview();
  return (
    <div className={buttons ? "row wrap" : "policy-links"}>
      {Object.entries(policyTitles).map(([type, title]) => (
        <a
          key={type}
          className={buttons ? "button secondary" : undefined}
          href={`/policy/${type}`}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            openSheet(`#policy-${type}`);
          }}
        >
          {title}
        </a>
      ))}
    </div>
  );
}
