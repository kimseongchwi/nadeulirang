"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Evidence } from "./api-types";
import { EvidenceList } from "./evidence";
import { Icon } from "@/components/ui/icons";

export function DetailIntroduction({ values }: { values: Evidence[] }) {
  const id = useId();
  const body = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const limit = Number.parseFloat(getComputedStyle(element).lineHeight) * 5;
      setOverflows(element.scrollHeight > limit + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [values]);
  return <section className="detail-section">
    <h2>소개</h2>
    <div id={id} ref={body} className={`detail-introduction${expanded ? " is-expanded" : ""}`}>
      <EvidenceList values={values} showLabels={false} />
    </div>
    {overflows && <button type="button" className="detail-introduction-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)}>
      <span>{expanded ? "접기" : "더 보기"}</span><Icon name="down" />
    </button>}
  </section>;
}
