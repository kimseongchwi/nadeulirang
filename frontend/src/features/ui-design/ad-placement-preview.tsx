"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import type { ApiResult, Page } from "@/features/outings/api-types";
import { outingSummary } from "@/features/outings/model";
import { OutingCard } from "@/features/outings/outing-card";

export function AdPlacementPreview({ result }: { result: ApiResult<Page> }) {
  const router = useRouter();
  if (!result.ok) return <ErrorState onRetry={() => router.refresh()} />;
  const items = result.data.items.map(outingSummary);
  if (!items.length) return <EmptyState title="미리 볼 나들이가 아직 없어요." />;
  return (
    <div
      className="guide-ad-frame"
      role="region"
      aria-label="광고 위치가 포함된 실제 목록 미리보기"
      tabIndex={0}
    >
      <p className="guide-ad-count">
        전체 {result.data.total}곳 · 첫 페이지 {items.length}곳
      </p>
      <ol className="guide-ad-list">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            <li>
              <OutingCard
                item={item}
                previewId={`ad-placement-${item.id}`}
              />
            </li>
            {(index === 5 || index === 13) && index + 1 < items.length && (
              <li>
                <aside
                  className="guide-ad-placeholder"
                  aria-label="광고 위치 미리보기"
                >
                  <span>광고</span>
                  <strong>광고 영역</strong>
                  <p>실제 광고가 표시될 자리</p>
                </aside>
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </div>
  );
}
