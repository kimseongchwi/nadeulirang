"use client";

import {
  kindNames,
  outingSummary,
} from "@/features/outings/model";
import { EmptyState } from "@/components/ui/feedback";
import { OutingCard } from "@/features/outings/outing-card";
import { ReviewLink, useReview } from "@/providers/review-provider";
import { Icon } from "@/components/ui/icons";
import type { Options, Page } from "./api-types";
import { Pagination } from "./pagination";
import { searchFormQuery } from "./api-query";

export function SearchReview({ data, options, query }: { data: Page; options: Options; query: string }) {
  const { navigate } = useReview();
  const filters = new URLSearchParams(query);
  const upcomingDays = Number(filters.get("days") || 14);
  const scope = filters.get("scope") || "";
  const customUpcoming = scope === "upcoming" && upcomingDays !== 14;
  const results = data.items.map(outingSummary);
  const pages = Math.ceil(data.total / data.pageSize);
  const pageUrl = (page: number) => { const next = new URLSearchParams(filters); next.set("page", String(page)); return `/search?${next}`; };
  return (
    <div className="outing-search">
      <div className="intro search-intro">
        <p className="eyebrow">마음에 드는 곳을 찾아봐요</p>
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
          const submitted = searchFormQuery(next);
          navigate(`/search${submitted.size ? `?${submitted}` : ""}`);
        }}
      >
        <div className="full search-keyword">
          <label htmlFor="keyword" className="sr-only">이름으로 검색</label>
          <Icon name="search" />
          <input
            id="keyword"
            name="q"
            placeholder="행사 또는 시설 이름"
            maxLength={200}
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
            {filters.get("region") && !options.regions.some((r) => r.code === filters.get("region")) && <option value={filters.get("region")!}>{filters.get("region")} · 확보한 자료 없음</option>}
            {options.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
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
                {options.kinds.some((item) => item.code === value)
                  ? ""
                  : " · 후보 확보 중"}
              </option>
            ))}
          </select>
        </div>
        <div className="search-scope">
          <label htmlFor="scope">검색 범위</label>
          <select id="scope" name="scope" defaultValue={customUpcoming ? `upcoming:${upcomingDays}` : scope}>
            <option value="">전체</option>
            <option value="ongoing">행사 기간 진행 중</option>
            <option value="upcoming">14일 안에 시작</option>
            <option value="permanent">상설 시설</option>
            {customUpcoming && <option value={`upcoming:${upcomingDays}`}>{upcomingDays}일 안에 시작</option>}
          </select>
        </div>
        <div className="search-sort">
          <label htmlFor="sort">정렬</label>
          <select id="sort" name="sort" defaultValue={filters.get("sort") || (scope === "ongoing" ? "END_DATE" : scope === "upcoming" ? "START_DATE" : scope === "permanent" ? "NAME" : "DEFAULT")}>
            <option value="DEFAULT">기본 순서</option><option value="NAME">이름 순</option>
            <option value="START_DATE">시작일 순</option><option value="END_DATE">종료일 순</option>
          </select>
        </div>
      </form>
      <section className="search-results">
        <div className="section-head">
          <h2>{query ? "조건에 맞는 나들이" : "둘러볼 나들이"} <span className="result-count">{data.total}</span></h2>
          {query && <ReviewLink href="/search" className="text-button">초기화</ReviewLink>}
        </div>
        {results.length ? (
          results.map((item) => <OutingCard key={item.id} item={item} />)
        ) : (
          <EmptyState
            title={data.total ? "이 페이지에는 결과가 없어요." : "조건에 맞는 곳이 없어요."}
            description={data.total ? "첫 페이지에서 검색 결과를 확인해 주세요." : "다른 이름·지역·종류로 찾아봐요."}
          >
            <ReviewLink href={data.total ? pageUrl(1) : "/search"} className="button secondary">
              {data.total ? "첫 페이지" : "초기화"}
            </ReviewLink>
          </EmptyState>
        )}
        <Pagination page={data.page} pages={pages} pageUrl={pageUrl} />
      </section>
    </div>
  );
}
