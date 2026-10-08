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
      const navHeight = document.getElementById("bottomNav")?.getBoundingClientRect().height || 0;
      element.style.left = `${Math.max(0, rect.left)}px`;
      element.style.width = `${Math.min(rect.right, window.innerWidth) - Math.max(0, rect.left)}px`;
      element.style.top = `${Math.max(0, rect.top)}px`;
      element.style.bottom = `${Math.max(navHeight, window.innerHeight - rect.bottom)}px`;
    }
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [container]);
  return container ? createPortal(<div className="navigation-progress" ref={progress}><LoadingState /></div>, container) : null;
}
