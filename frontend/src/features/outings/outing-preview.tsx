"use client";

import { ReviewDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/features/outings/outing-card";
import { OutingArtwork, PhotoCredit } from "@/features/outings/outing-artwork";
import { kindNames, period, permanent, photoId, type Outing } from "@/features/outings/model";
import { useReview } from "@/providers/review-provider";

export function OutingPreview({ item, open }: { item: Outing; open: boolean }) {
  const { closeSheet, navigate } = useReview();
  return (
    <ReviewDialog id={`outingPreview-${item.id}`} title="간단 보기" open={open} onClose={closeSheet} sheet className="policy-sheet outing-preview">
      <div className="outing-preview-body">
        <OutingArtwork item={item} large />
        <div className="outing-preview-content">
          <div className="outing-card-meta">{kindNames[item.kind]}</div>
          <h2>{item.name}</h2>
          <Badge item={item} />
          <dl className="preview-facts">
            <div><dt><Icon name="pin" />위치</dt><dd>{item.region_name}{item.district_name ? ` ${item.district_name}` : ""}</dd></div>
            {!permanent(item) && <div><dt><Icon name="calendar" />행사 일정</dt><dd>{period(item)}</dd></div>}
            <div><dt><Icon name="ticket" />운영·요금</dt><dd>확인 필요</dd></div>
          </dl>
          <p className="preview-note">운영 시간·휴무·요금·예약은 출발 전 공식 안내를 확인해 주세요.</p>
          {item.id === photoId && <PhotoCredit />}
        </div>
      </div>
      <div className="outing-preview-actions"><button type="button" className="button primary" onClick={() => navigate(`/detail/${item.id}`, true)}>상세 정보 보기 <Icon name="next" /></button></div>
    </ReviewDialog>
  );
}
