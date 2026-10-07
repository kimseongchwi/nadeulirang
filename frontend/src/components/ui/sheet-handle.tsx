"use client";

import { useRef, useState, type RefObject, type PointerEvent } from "react";
import { sheetDragHeight, sheetDragTarget, type SheetBounds } from "./sheet-drag";

export function SheetHandle({ dialogRef, boundsRef, onClose, title }: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  boundsRef: RefObject<SheetBounds | null>;
  onClose: () => void;
  title: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ id: number; y: number; height: number; delta: number; expanded: boolean } | null>(null);
  const skipClick = useRef(false);
  function settle(next: "expanded" | "collapsed") {
    const dialog = dialogRef.current, bounds = boundsRef.current;
    if (!dialog || !bounds) return;
    dialog.dataset.expanded = String(next === "expanded");
    dialog.style.height = `${bounds[next]}px`;
    dialog.style.maxHeight = `${bounds.expanded}px`;
    dialog.style.removeProperty("translate");
    delete dialog.dataset.dragging;
    dialog.dispatchEvent(new Event("sheet-settle"));
    setExpanded(next === "expanded");
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = drag.current, dialog = dialogRef.current, bounds = boundsRef.current;
    if (!current || current.id !== event.pointerId || !dialog || !bounds) return;
    drag.current = null;
    skipClick.current = !cancelled && Math.abs(current.delta) > 8;
    const next = cancelled ? current.expanded ? "expanded" : "collapsed"
      : sheetDragTarget(current.height, current.delta, bounds, current.expanded);
    settle(next === "close" ? "collapsed" : next);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (next === "close") onClose();
  }
  return <button type="button" className="sheet-handle" aria-label={`${title} 크기 조절`} aria-expanded={expanded}
    onPointerDown={(event) => {
      const dialog = dialogRef.current;
      if (!dialog || !boundsRef.current || !event.isPrimary || event.button !== 0) return;
      drag.current = { id: event.pointerId, y: event.clientY, height: dialog.getBoundingClientRect().height, delta: 0, expanded };
      skipClick.current = false;
      dialog.dataset.dragging = "true";
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const current = drag.current, dialog = dialogRef.current, bounds = boundsRef.current;
      if (!current || current.id !== event.pointerId || !dialog || !bounds) return;
      current.delta = event.clientY - current.y;
      const preview = sheetDragHeight(current.height, current.delta, bounds);
      dialog.style.height = `${preview.height}px`;
      dialog.style.maxHeight = `${bounds.expanded}px`;
      dialog.style.translate = `0 ${preview.offset}px`;
    }}
    onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)}
    onLostPointerCapture={(event) => finish(event, true)}
    onClick={(event) => {
      if (event.detail > 0 && skipClick.current) { skipClick.current = false; return; }
      settle(expanded ? "collapsed" : "expanded");
    }}
    onKeyDown={(event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        settle(event.key === "ArrowUp" ? "expanded" : "collapsed");
      }
    }}><span aria-hidden="true" /></button>;
}
