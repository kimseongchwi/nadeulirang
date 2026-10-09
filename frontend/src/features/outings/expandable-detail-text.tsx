"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Evidence } from "./api-types";
import { EvidenceList, EvidenceSources } from "./evidence";
import { programTextLines } from "./program-text";
import { Icon } from "@/components/ui/icons";

export function ExpandableDetailText({ values, emphasizeHeadings = false }: { values: Evidence[]; emphasizeHeadings?: boolean }) {
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
  return <>
    <div id={id} ref={body} className={`detail-text${expanded ? " is-expanded" : ""}`}>
      {emphasizeHeadings && values.length ? <div className="evidence-list">{values.map((entry, index) =>
        <div className="evidence-entry" key={`${entry.observationId}-${entry.field}-${index}`}>
          <p className="evidence-value">{programTextLines(entry.value).map((line, lineIndex) => line.heading
            ? <span key={lineIndex}><strong className="program-subheading">{line.headingText}</strong>{line.text.slice(line.headingText!.length)}</span> : line.text)}</p>
        </div>)}
      </div> : <EvidenceList values={values} showLabels={false} showSources={false} />}
    </div>
    {overflows && <button type="button" className="detail-text-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)}>
      <span>{expanded ? "접기" : "더 보기"}</span><Icon name="down" />
    </button>}
    <EvidenceSources values={values} />
  </>;
}
