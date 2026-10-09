// 세로 스크롤과 짧은 접촉은 사진 넘김으로 해석하지 않는다.
export function photoSwipe(start: { x: number; y: number }, end: { x: number; y: number }): -1 | 0 | 1 {
  const dx = end.x - start.x, dy = end.y - start.y;
  return Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5 ? dx < 0 ? 1 : -1 : 0;
}
export function photoDrag(start: { x: number; y: number }, end: { x: number; y: number }): number {
  const dx = end.x - start.x, dy = end.y - start.y;
  return Math.abs(dx) >= 6 && Math.abs(dx) > Math.abs(dy) * 1.5 ? dx : 0;
}
