"use client";

import { useEffect } from "react";

export function ReviewDevTools({ guide }: { guide: boolean }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!guide && window.self === window.top) return;

    const styles = new Set<HTMLStyleElement>();
    function hideIndicator() {
      for (const portal of document.querySelectorAll("nextjs-portal")) {
        const root = portal.shadowRoot;
        if (!root || root.getElementById("review-indicator-style")) continue;
        const style = document.createElement("style");
        style.id = "review-indicator-style";
        // 개발 도구 버튼만 숨기고 오류 오버레이는 유지한다.
        style.textContent = "#devtools-indicator { display: none !important; }";
        root.append(style);
        styles.add(style);
      }
    }
    hideIndicator();
    const observer = new MutationObserver(hideIndicator);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      for (const style of styles) style.remove();
    };
  }, [guide]);

  return null;
}
