"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { NavigationLink } from "@/providers/navigation-provider";

type PaginationProps = { page: number; pages: number; label?: string } & (
  | { pageUrl: (page: number) => string; onPageChange?: never }
  | { pageUrl?: never; onPageChange: (page: number) => void }
);

export function Pagination({ page, pages, label = "검색 결과 페이지", pageUrl, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;
  const firstPage = Math.max(1, Math.min(page - 2, pages - 4));
  const compactFirstPage = Math.max(1, Math.min(page - 1, pages - 2));
  const visiblePages = Array.from({ length: Math.min(pages, 5) }, (_, index) => firstPage + index);
  function control(target: number, className: string, name: string, children: ReactNode) {
    return pageUrl
      ? <NavigationLink className={className} href={pageUrl(target)} aria-label={name}>{children}</NavigationLink>
      : <button className={className} type="button" aria-label={name} onClick={() => onPageChange?.(target)}>{children}</button>;
  }
  return <div className="pagination-container">
    <nav className="result-pages" aria-label={label}>
      {page > 1
        ? control(Math.min(page - 1, pages), "result-page", "이전 페이지", <Icon name="back" />)
        : <button className="result-page" type="button" disabled aria-label="이전 페이지"><Icon name="back" /></button>}
      {visiblePages.map((target) => {
        const className = `result-page result-page-number${pages > 4 && (target < compactFirstPage || target > compactFirstPage + 2) ? " is-extra" : ""}`;
        return <span key={target} className="result-page-slot">
          {target === page
            ? <span className={className} aria-current="page" aria-label={`${target}페이지, 현재 페이지`}>{target}</span>
            : control(target, className, `${target}페이지`, target)}
        </span>;
      })}
      {page < pages
        ? control(page + 1, "result-page", "다음 페이지", <Icon name="next" />)
        : <button className="result-page" type="button" disabled aria-label="다음 페이지"><Icon name="next" /></button>}
    </nav>
  </div>;
}
