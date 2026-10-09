"use client";

import { useSearchParams } from "next/navigation";
import { policyTitles } from "@/features/policies/model";
import { useNavigation } from "@/providers/navigation-provider";
import { Icon } from "@/components/ui/icons";

export function PolicyLinks({
  variant = "inline",
}: {
  variant?: "inline" | "buttons" | "footer";
}) {
  const { openSheet, pathname } = useNavigation();
  const query = useSearchParams();
  const samplePhoto = pathname === "/ui-design" || pathname === "/policy/about" && query.get("sample") === "clayarch";
  return (
    <div className={variant === "buttons" ? "row wrap" : "policy-links"}>
      {Object.entries(policyTitles).map(([type, title]) => (
        <a
          key={type}
          className={variant === "buttons" ? "button secondary" : undefined}
          href={type === "about" && samplePhoto ? "/policy/about?sample=clayarch" : `/policy/${type}`}
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
