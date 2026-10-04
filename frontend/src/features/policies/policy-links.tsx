"use client";

import { policyTitles } from "@/features/policies/model";
import { useReview } from "@/providers/review-provider";
import { Icon } from "@/components/ui/icons";

export function PolicyLinks({
  variant = "inline",
}: {
  variant?: "inline" | "buttons" | "footer";
}) {
  const { openSheet } = useReview();
  return (
    <div className={variant === "buttons" ? "row wrap" : "policy-links"}>
      {Object.entries(policyTitles).map(([type, title]) => (
        <a
          key={type}
          className={variant === "buttons" ? "button secondary" : undefined}
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
          {variant === "footer" && type === "about" && <Icon name="next" />}
        </a>
      ))}
    </div>
  );
}
