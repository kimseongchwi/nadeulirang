"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LoadingState } from "@/components/ui/feedback";

function subscribe(listener: () => void) {
  window.addEventListener("service-dialog-state", listener);
  return () => window.removeEventListener("service-dialog-state", listener);
}
function target() {
  return document.querySelector("dialog[open]") || document.querySelector(".service");
}
export function NavigationProgress() {
  const container = useSyncExternalStore(subscribe, target, () => null);
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container || container.tagName === "DIALOG") return;
    function position() {
      const element = progress.current;
      if (!element || !container) return;
      const rect = container.getBoundingClientRect();
      const main = document.getElementById("main")?.getBoundingClientRect();
      const headerBottom = document.querySelector(".service-header")?.getBoundingClientRect().bottom || 0;
      const navHeight = document.getElementById("bottomNav")?.getBoundingClientRect().height || 0;
      const left = Math.max(0, main?.left ?? rect.left);
      element.style.left = `${left}px`;
      element.style.width = `${Math.max(0, Math.min(main?.right ?? rect.right, window.innerWidth) - left)}px`;
      element.style.top = `${Math.max(0, rect.top, headerBottom)}px`;
      element.style.bottom = `${Math.max(navHeight, window.innerHeight - rect.bottom)}px`;
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [container]);
  return container ? createPortal(<div className="navigation-progress" ref={progress}><LoadingState placement={container.tagName === "DIALOG" ? "area" : "page"} /></div>, container) : null;
}
