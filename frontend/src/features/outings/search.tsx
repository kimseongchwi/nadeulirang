"use client";

import {
  kindNames,
  normalizedFilters,
  searchItems,
} from "@/features/outings/model";
import { EmptyState } from "@/components/ui/feedback";
import { OutingCard } from "@/features/outings/outing-card";
import { ReviewLink, useReview } from "@/providers/review-provider";
import { Icon } from "@/components/ui/icons";

export function SearchReview() {
  const { params, items, today, upcomingDays, navigate } = useReview();
  const filters = normalizedFilters(params, today);
  const query = filters.toString();
  const scope = filters.get("scope") || "";
  const scopeTitles: Record<string, string> = {
    ongoing: "기간 진행 중",
    upcoming: `${upcomingDays}일 안에 시작`,
    permanent: "상설 시설",
  };
  const results = searchItems(filters, today, upcomingDays);
  return (
    <div className="outing-search">
      <div className="intro search-intro">
        <p className="eyebrow">가고 싶은 곳을, 더 쉽게</p>
        <h1>나들이 검색</h1>
      </div>
      <form
        key={query}
        className="filters search-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = new URLSearchParams();
          for (const [key, value] of data)
            if (String(value).trim()) next.set(key, String(value).trim());
          navigate(`/search${next.size ? `?${next}` : ""}`);
        }}
      >
        <div className="full search-keyword">
          <label htmlFor="keyword" className="sr-only">이름으로 검색</label>
          <Icon name="search" />
          <input
            id="keyword"
            name="q"
            placeholder="행사 또는 시설 이름"
            defaultValue={filters.get("q") || ""}
          />
          <button className="button primary" type="submit">검색</button>
        </div>
        <div>
          <label htmlFor="region">지역</label>
          <select
            id="region"
            name="region"
            defaultValue={filters.get("region") || ""}
          >
            <option value="">전체 지역</option>
            {[...new Set(items.map((item) => item.region_name))]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="kind">종류</label>
          <select
            id="kind"
            name="kind"
            defaultValue={filters.get("kind") || ""}
          >
            <option value="">전체 종류</option>
            {Object.entries(kindNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
                {items.some((item) => item.kind === value)
                  ? ""
                  : " · 후보 확보 중"}
              </option>
            ))}
          </select>
        </div>
        {scope && (
          <>
            <input type="hidden" name="scope" value={scope} />
            <div className="full callout">
              홈에서 선택한 조건: {scopeTitles[scope]}
              <br />
              <ReviewLink href="/search">기간 조건 해제</ReviewLink>
            </div>
          </>
        )}
      </form>
      <section className="search-results">
        <div className="section-head">
          <h2>{query ? "조건에 맞는 나들이" : "둘러볼 나들이"} <span className="result-count">{results.length}</span></h2>
          {query && <ReviewLink href="/search" className="text-button">초기화</ReviewLink>}
        </div>
        {results.length ? (
          results.map((item) => <OutingCard key={item.id} item={item} />)
        ) : (
          <EmptyState
            title="조건에 맞는 곳이 없어요."
            description="다른 이름·지역·종류로 찾아봐요."
          >
            <ReviewLink href="/search" className="button secondary">
              초기화
            </ReviewLink>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
