export type SheetBounds = { collapsed: number; expanded: number; minimum: number };
export function sheetBounds(available: number, natural: number): SheetBounds {
  const expanded = Math.max(0, available * 0.95);
  const minimum = Math.min(180, expanded);
  return { collapsed: Math.min(expanded, Math.max(minimum, natural)), expanded, minimum };
}
export function sheetDragHeight(start: number, delta: number, bounds: SheetBounds) {
  const requested = start - delta;
  return { height: Math.max(bounds.minimum, Math.min(bounds.expanded, requested)),
    offset: Math.max(0, bounds.minimum - requested) };
}
export function sheetDragTarget(start: number, delta: number, bounds: SheetBounds, expanded: boolean) {
  if (delta > 0 && start - delta < bounds.collapsed - Math.max(100, bounds.collapsed * 0.3)) return "close";
  if (delta < -48) return "expanded";
  if (delta > 48) return "collapsed";
  return expanded ? "expanded" : "collapsed";
}
