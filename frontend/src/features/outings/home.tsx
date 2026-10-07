"use client";

import { useEffect, useRef } from "react";
import {
  kindNames,
  outingSummary,
  type Outing,
} from "@/features/outings/model";
import type { Home, Options } from "./api-types";
import { EmptyState } from "@/components/ui/feedback";
import { OutingCard } from "@/features/outings/outing-card";
import { Icon } from "@/components/ui/icons";
import { ReviewLink, useReview } from "@/providers/review-provider";
import { HomeFilter } from "./home-filter";

function HomeSection({
  title,
  description,
  items,
  scope,
  emptyText,
  query,
  days,
}: {
  title: string;
  description: string;
  items: Outing[];
  scope: string;
  emptyText: string;
  query: string;
  days: number;
}) {
  const search = new URLSearchParams(query);
  search.set("scope", scope);
  if (scope === "upcoming") search.set("days", String(days));
  return (
    <section className="outing-section">
      <div className="section-head">
        <h2>{title}</h2>
        <ReviewLink href={`/search?${search}`} className="more">
          더 보기 <Icon name="next" />
        </ReviewLink>
      </div>
      <p className="section-description">{description}</p>
      {items.length ? (
        items
          .slice(0, 3)
          .map((item) => <OutingCard key={item.id} item={item} />)
      ) : (
        <EmptyState title="확인한 항목이 아직 없어요." description={emptyText}>
          <ReviewLink href="/search" className="button secondary">
            전체 검색
          </ReviewLink>
        </EmptyState>
      )}
    </section>
  );
}
export function HomeReview({ data, options, query }: { data: Home; options: Options; query: string }) {
  const chipDrag = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    dragged: boolean;
  } | null>(null);
  const { setHomeQuery, openSheet, hash } =
    useReview();
  const filters = new URLSearchParams(query);
  const region = filters.get("region") || "";
  const kind = filters.get("kind") || "";
  useEffect(() => {
    if (window.self === window.top) setHomeQuery(query);
  }, [query, setHomeQuery]);
  const days = data.days;
  const regionName = options.regions.find((r) => r.code === region)?.name || region;
  return (
    <div className="outing-home">
      <HomeFilter open={hash === "#filters"} options={options} />
      <div className="hero">
        <span
          className="hero-mark people-mask"
          role="img"
          aria-label="함께 걷는 두 사람"
        />
        <p className="eyebrow">가까운 하루, 새로운 발견</p>
        <h1>
          오늘은 어디로
          <br />
          나들이 갈까요?
        </h1>
        <p>
          가볍게 떠나고 싶은 날,<br />마음이 가는 곳을 발견해요
        </p>
        <ReviewLink className="hero-link" href={query ? `/search?${query}` : "/search"}>나들이 찾아보기 <Icon name="next" /></ReviewLink>
      </div>
      <div className="home-filter-bar">
        <button
          id="homeFilterOpen"
          className="home-filter-trigger"
          aria-haspopup="dialog"
          aria-expanded={hash === "#filters"}
          onClick={() => openSheet("#filters")}
        >
          <Icon name="filter" />
          <span>
            {regionName || "전체 지역"} · {kindNames[kind] || "전체 종류"}
          </span>
          <Icon name="down" />
        </button>
        {query && (
          <ReviewLink href="/" className="text-button">
            초기화
          </ReviewLink>
        )}
      </div>
      <nav
        className="kind-chips"
        aria-label="나들이 종류"
        aria-describedby="kind-scroll-help"
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) {
            chipDrag.current = null;
            return;
          }
          chipDrag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScroll: event.currentTarget.scrollLeft,
            dragged: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = chipDrag.current;
          if (!drag || drag.pointerId !== event.pointerId || !event.buttons) return;
          const distance = event.clientX - drag.startX;
          if (!drag.dragged && Math.abs(distance) < 6) return;
          drag.dragged = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.scrollLeft = drag.startScroll - distance;
          event.preventDefault();
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { chipDrag.current = null; }}
        onPointerLeave={() => {
          if (!chipDrag.current?.dragged) chipDrag.current = null;
        }}
        onClickCapture={(event) => {
          if (chipDrag.current?.dragged) {
            event.preventDefault();
            event.stopPropagation();
          }
          chipDrag.current = null;
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            event.currentTarget.scrollBy(event.key === "ArrowRight" ? 120 : -120, 0);
          }
        }}
      >
        {[["", "전체"], ...Object.entries(kindNames)].map(([value, label]) => {
          const next = new URLSearchParams(filters);
          if (value) next.set("kind", value); else next.delete("kind");
          return <ReviewLink key={value} href={`/${next.size ? `?${next}` : ""}`} draggable={false} aria-current={kind === value ? "true" : undefined}>{label}</ReviewLink>;
        })}
      </nav>
      <p id="kind-scroll-help" className="sr-only">좌우로 밀거나 방향키로 종류 목록을 이동할 수 있어요.</p>
      {query && (
        <p className="hint">선택한 조건으로 홈에서 둘러볼 나들이 {data.total}곳</p>
      )}
      <HomeSection
        title="지금 만나는 나들이"
        description="오늘의 즐거움을 발견해보세요"
        items={data.ongoing.map(outingSummary)}
        query={query} days={days}
        scope="ongoing"
        emptyText="확인한 진행 중 기간 행사가 아직 없어요."
      />
      <HomeSection
        title="곧 시작하는 나들이"
        description={`내일부터 ${days}일 안에 시작해요`}
        items={data.upcoming.map(outingSummary)}
        query={query} days={days}
        scope="upcoming"
        emptyText="이 기간에 시작하는 행사 자료가 아직 없어요."
      />
      <HomeSection
        title="일상에서 만나는 나들이"
        description="일상에 작은 쉼표를 더해보세요"
        items={data.permanent.map(outingSummary)}
        query={query} days={days}
        scope="permanent"
        emptyText="확인한 상설 시설 자료가 아직 없어요."
      />
    </div>
  );
}
