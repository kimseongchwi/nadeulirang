"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { OutingArtwork } from "./outing-artwork";
import type { Photo } from "./api-types";
import type { Outing } from "./model";
import { photoDrag, photoSwipe } from "./photo-gesture";

export function PhotoGallery({ item, photos }: { item: Outing; photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; pointerId: number; horizontal: boolean } | null>(null);
  const dragged = useRef(false);
  useEffect(() => {
    const strip = thumbnails.current;
    const button = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!strip || !button) return;
    const frame = strip.getBoundingClientRect();
    const selected = button.getBoundingClientRect();
    if (selected.left < frame.left) strip.scrollLeft -= frame.left - selected.left;
    else if (selected.right > frame.right) strip.scrollLeft += selected.right - frame.right;
  }, [index, photos]);
  if (!photos.length) return <OutingArtwork item={item} large />;
  const activeIndex = index < photos.length ? index : 0;
  const selected = photos[activeIndex];
  const multiple = photos.length > 1;
  const fallbackIcon = item.kind === "MUSEUM" || item.kind === "CULTURAL_SITE" ? "landmark" : item.kind === "EXHIBITION" ? "spark" : "ticket";
  function select(position: number) { setIndex(position); }
  function move(offset: number) { select((activeIndex + offset + photos.length) % photos.length); }
  function fail(url: string) { setFailed((current) => new Set(current).add(url)); }
  return <div className="photo-gallery" role="region" aria-label={`${item.name} 사진`}>
    <div className="gallery-stage" tabIndex={multiple ? 0 : undefined}
      aria-label={multiple ? "사진 영역, 좌우 방향키로 사진 이동" : undefined}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !multiple) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
        if (event.key === "Home" || event.key === "End") { event.preventDefault(); select(event.key === "Home" ? 0 : photos.length - 1); }
      }}
      onTouchStart={(event) => { const touch = event.touches[0]; gesture.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null; }}
      onTouchCancel={() => { gesture.current = null; }}
      onTouchMove={(event) => { if (event.touches.length !== 1) gesture.current = null; }}
      onTouchEnd={(event) => {
        const start = gesture.current; gesture.current = null;
        const end = event.changedTouches[0];
        if (!multiple || !start || !end) return;
        const direction = photoSwipe(start, { x: end.clientX, y: end.clientY });
        if (direction) move(direction);
      }}>
      {failed.has(selected.url) ? <div className="gallery-failed"><Icon name={fallbackIcon} /><p>이 사진을 불러오지 못했어요.</p>{multiple && <p>다른 사진을 선택해 주세요.</p>}</div>
        : <Image key={selected.url} src={selected.url} alt={`${item.name} 사진 ${activeIndex + 1}`} width={720} height={480} unoptimized
          onError={() => fail(selected.url)} referrerPolicy="no-referrer" draggable={false} />}
    </div>
    {multiple && <div className="gallery-controls">
      <button type="button" className="icon-button" aria-label="이전 사진" onClick={() => move(-1)}><Icon name="back" /></button>
      <span role="status" aria-live="polite" aria-atomic="true">{activeIndex + 1} / {photos.length}</span>
      <button type="button" className="icon-button" aria-label="다음 사진" onClick={() => move(1)}><Icon name="next" /></button>
    </div>}
    {multiple && <div ref={thumbnails} className="gallery-thumbnails" aria-label="사진 선택"
      onPointerDown={(event) => {
        dragged.current = false;
        drag.current = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, pointerId: event.pointerId, horizontal: false } : null;
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const dx = photoDrag(start, { x: event.clientX, y: event.clientY });
        if (!start.horizontal && !dx) return;
        if (!start.horizontal) { start.horizontal = true; event.currentTarget.setPointerCapture(event.pointerId); }
        event.preventDefault();
        dragged.current = true;
        event.currentTarget.scrollLeft = start.left - (event.clientX - start.x);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        drag.current = null;
      }}
      onPointerCancel={() => { drag.current = null; dragged.current = false; }}
      onClickCapture={(event) => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
      {photos.map((photo, position) => <button key={photo.id} type="button" aria-label={`사진 ${position + 1} 선택`}
        aria-pressed={position === activeIndex} onClick={() => select(position)}>
        {failed.has(photo.thumbnailUrl || photo.url) ? <Icon name={fallbackIcon} />
          : <Image src={photo.thumbnailUrl || photo.url} alt="" width={64} height={48} unoptimized draggable={false} referrerPolicy="no-referrer" onError={() => fail(photo.thumbnailUrl || photo.url)} />}
      </button>)}
    </div>}
    <details className="evidence-alternatives gallery-original"><summary>사진 원본</summary><a href={selected.url} target="_blank" rel="noopener noreferrer">현재 사진 {activeIndex + 1} 원본 보기</a></details>
  </div>;
}
