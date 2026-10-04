"use client";

import { useEffect } from "react";
import {
  kindNames,
  normalizedFilters,
  ongoing,
  permanent,
  upcoming,
  type Outing,
} from "@/features/outings/model";
import { EmptyState } from "@/components/ui/feedback";
import { OutingCard, ScopeNote } from "@/features/outings/outing-card";
import { Icon } from "@/components/ui/icons";
import { ReviewLink, useReview } from "@/providers/review-provider";

function HomeSection({
  title,
  description,
  items,
  scope,
  emptyText,
}: {
  title: string;
  description: string;
  items: Outing[];
  scope: string;
  emptyText: string;
}) {
  const { params, today } = useReview();
  const query = normalizedFilters(params, today, true);
  query.set("scope", scope);
  return (
    <section>
      <div className="section-head">
        <h2>{title}</h2>
        <ReviewLink href={`/search?${query}`} className="more">
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
export function HomeReview() {
  const { params, items, today, upcomingDays, setHomeQuery, openSheet, hash } =
    useReview();
  const filters = normalizedFilters(params, today, true);
  const query = filters.toString();
  const region = filters.get("region") || "";
  const kind = filters.get("kind") || "";
  useEffect(() => {
    if (window.self === window.top) setHomeQuery(query);
  }, [query, setHomeQuery]);
  const days = windowDays(params.get("previewDays"), upcomingDays);
  const filtered = items.filter(
    (item) =>
      (!region || item.region_name === region) && (!kind || item.kind === kind),
  );
  return (
    <>
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
          지금 만날 전시, 곧 시작할 축제.
          <br />
          일상 가까이에서 새로운 하루를 찾아요.
        </p>
      </div>
      <ScopeNote />
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
            {region || "전체 지역"} · {kindNames[kind] || "전체 종류"}
          </span>
          <Icon name="down" />
        </button>
        {query && (
          <ReviewLink href="/" className="text-button">
            초기화
          </ReviewLink>
        )}
      </div>
      {query && (
        <p className="hint">선택한 조건의 나들이 {filtered.length}곳</p>
      )}
      <HomeSection
        title="지금 만나는 나들이"
        description="행사 기간 기준이에요. 당일 운영·예약은 별도로 확인해 주세요."
        items={filtered
          .filter((item) => ongoing(item, today))
          .sort(
            (a, b) =>
              (a.event_end || "").localeCompare(b.event_end || "") ||
              a.id.localeCompare(b.id),
          )}
        scope="ongoing"
        emptyText="확인한 진행 중 기간 행사가 아직 없어요."
      />
      <HomeSection
        title="곧 시작하는 나들이"
        description={`내일부터 ${days}일 안에 시작해요.`}
        items={filtered
          .filter((item) => upcoming(item, today, days))
          .sort(
            (a, b) =>
              (a.event_start || "").localeCompare(b.event_start || "") ||
              a.id.localeCompare(b.id),
          )}
        scope="upcoming"
        emptyText="이 기간에 시작하는 행사 자료가 아직 없어요."
      />
      <HomeSection
        title="언제든 떠올릴 나들이"
        description="상설 시설이에요. 휴관·운영 시간은 출발 전에 확인해 주세요."
        items={filtered
          .filter(permanent)
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id),
          )}
        scope="permanent"
        emptyText="확인한 상설 시설 자료가 아직 없어요."
      />
    </>
  );
}
function windowDays(value: string | null, fallback: number) {
  return value && [7, 14, 30].includes(Number(value))
    ? Number(value)
    : fallback;
}
