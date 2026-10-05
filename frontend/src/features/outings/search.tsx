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

export function SearchReview({ data, options, query }: { data: Page; options: Options; query: string }) {
  const { navigate } = useReview();
  const filters = new URLSearchParams(query);
  const upcomingDays = Number(filters.get("days") || 14);
  const scope = filters.get("scope") || "";
  const scopeTitles: Record<string, string> = {
    ongoing: "기간 진행 중",
    upcoming: `${upcomingDays}일 안에 시작`,
    permanent: "상설 시설",
  };
  const results = data.items.map(outingSummary);
  const pages = Math.ceil(data.total / data.pageSize);
  const firstPage = Math.max(1, Math.min(data.page - 2, pages - 4));
  const compactFirstPage = Math.max(1, Math.min(data.page - 1, pages - 2));
  const visiblePages = Array.from({ length: Math.min(pages, 5) }, (_, index) => firstPage + index);
  const pageUrl = (page: number) => { const next = new URLSearchParams(filters); next.set("page", String(page)); return `/search?${next}`; };
  const withoutScope = new URLSearchParams(filters);
  for (const key of ["scope", "days", "page"]) withoutScope.delete(key);
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
        <div className="full">
          <label htmlFor="sort">정렬</label>
          <select id="sort" name="sort" defaultValue={filters.get("sort") || (scope === "ongoing" ? "END_DATE" : scope === "upcoming" ? "START_DATE" : scope === "permanent" ? "NAME" : "DEFAULT")}>
            <option value="DEFAULT">기본 순서</option><option value="NAME">이름 순</option>
            <option value="START_DATE">시작일 순</option><option value="END_DATE">종료일 순</option>
          </select>
        </div>
        {scope && (
          <>
            <input type="hidden" name="scope" value={scope} />
            {scope === "upcoming" && <input type="hidden" name="days" value={upcomingDays} />}
            <div className="full callout">
              홈에서 선택한 조건: {scopeTitles[scope]}
              <br />
              <ReviewLink href={`/search${withoutScope.size ? `?${withoutScope}` : ""}`}>기간 조건 해제</ReviewLink>
            </div>
          </>
        )}
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
        {pages > 1 && <nav className="result-pages" aria-label="검색 결과 페이지">
          {data.page > 1
            ? <ReviewLink className="result-page" href={pageUrl(Math.min(data.page - 1, pages))} aria-label="이전 페이지"><Icon name="back" /></ReviewLink>
            : <button className="result-page" type="button" disabled aria-label="이전 페이지"><Icon name="back" /></button>}
          {visiblePages.map((page) => {
            const className = `result-page result-page-number${pages > 4 && (page < compactFirstPage || page > compactFirstPage + 2) ? " is-extra" : ""}`;
            return page === data.page
              ? <span key={page} className={className} aria-current="page" aria-label={`${page}페이지, 현재 페이지`}>{page}</span>
              : <ReviewLink key={page} className={className} href={pageUrl(page)} aria-label={`${page}페이지`}>{page}</ReviewLink>;
          })}
          {data.page < pages
            ? <ReviewLink className="result-page" href={pageUrl(data.page + 1)} aria-label="다음 페이지"><Icon name="next" /></ReviewLink>
            : <button className="result-page" type="button" disabled aria-label="다음 페이지"><Icon name="next" /></button>}
        </nav>}
      </section>
    </div>
  );
}
