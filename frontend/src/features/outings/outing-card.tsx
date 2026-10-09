"use client";

import { kindNames, period, permanent, regionLabel, type Outing } from "@/features/outings/model";
import { NavigationLink, useNavigation } from "@/providers/navigation-provider";
import { Icon } from "@/components/ui/icons";
import { OutingArtwork } from "@/features/outings/outing-artwork";
import { Badge } from "./outing-badge";
import { OutingPreview } from "./outing-preview";

export { Badge } from "./outing-badge";
export function OutingCard({ item, sample = false }: { item: Outing; sample?: boolean }) {
  const { openSheet, hash } = useNavigation();
  return (
    <article className="outing-card">
      <button type="button" className="outing-card-open" aria-label={`${item.name} 간단 보기`} aria-haspopup="dialog" onClick={() => openSheet(`#outing-${item.id}`)}>
        <OutingArtwork item={item} />
        <span className="outing-card-content">
          <span className="outing-card-meta">{regionLabel(item.region_name, item.district_name)} <span>·</span> {kindNames[item.kind]}</span>
          <span className="outing-card-name">{item.name}</span>
          {!permanent(item) && <span className="outing-card-period">{period(item)}</span>}
          <span className="outing-card-bottom"><Badge item={item} /></span>
        </span>
      </button>
      <NavigationLink className="outing-card-arrow" href={`/detail/${item.id}`} aria-label={`${item.name} 상세 정보`}><Icon name="next" /></NavigationLink>
      <OutingPreview item={item} open={hash === `#outing-${item.id}`} sample={sample} />
      {sample && <span className="sr-only">실제 확보한 자료의 검토용 카드</span>}
    </article>
  );
}
