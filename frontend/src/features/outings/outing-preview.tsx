"use client";

import { ReviewDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { Badge } from "./outing-badge";
import { OutingArtwork } from "@/features/outings/outing-artwork";
import { kindNames, period, permanent, regionLabel, type Outing } from "@/features/outings/model";
import { useReview } from "@/providers/review-provider";
import { useEffect, useState } from "react";
import type { Detail } from "./api-types";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/feedback";
import { previewLocation } from "./api-query";
import { isDetail } from "./api-contract";

export function OutingPreview({ item, open, sample = false }: { item: Outing; open: boolean; sample?: boolean }) {
  const { closeSheet, navigate, pending } = useReview();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ data?: Detail; status?: number } | null>(null);
  useEffect(() => {
    if (sample || !open) return;
    const controller = new AbortController();
    fetch(`/api/outings/${item.id}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) { if (!controller.signal.aborted) setResult({ status: response.status }); return; }
        const data: unknown = await response.json();
        if (!controller.signal.aborted) setResult(isDetail(data) ? { data } : { status: 503 });
      })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: 503 }); });
    return () => controller.abort();
  }, [item.id, sample, attempt, open]);
  return (
    <ReviewDialog id={`outingPreview-${item.id}`} title="간단 보기" open={open} onClose={closeSheet} sheet className="policy-sheet outing-preview">
      <div className="outing-preview-body">
        <OutingArtwork item={item} large />
        <div className="outing-preview-content">
          <div className="outing-card-meta">{kindNames[item.kind]}</div>
          <h2>{item.name}</h2>
          <Badge item={item} />
          <dl className="preview-facts">
            <div><dt><Icon name="pin" />위치</dt><dd>{result?.data ? previewLocation(result.data) : regionLabel(item.region_name, item.district_name)}</dd></div>
            {!permanent(item) && <div><dt><Icon name="calendar" />행사 일정</dt><dd>{period(item)}</dd></div>}
            <div><dt><Icon name="ticket" />운영·요금</dt><dd>상세 정보에서 보기</dd></div>
          </dl>
          {!sample && !pending && (!result ? <LoadingState /> : result.status ? result.status === 404 ? <EmptyState title="공개된 정보를 찾을 수 없어요." description="삭제되거나 공개 대상에서 제외된 자료일 수 있어요." /> : <ErrorState onRetry={() => { setResult(null); setAttempt((value) => value + 1); }} /> : null)}
        </div>
      </div>
      <div className="outing-preview-actions"><button type="button" className="button primary" onClick={() => navigate(`/detail/${item.id}`, true)}>상세 정보 보기 <Icon name="next" /></button></div>
    </ReviewDialog>
  );
}
