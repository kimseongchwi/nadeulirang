import Image from "next/image";
import { Icon } from "@/components/ui/icons";
import { kindNames, photoId, type Outing } from "@/features/outings/model";

export function OutingArtwork({ item, large = false }: { item: Outing; large?: boolean }) {
  const photo = item.id === photoId;
  return (
    <span className={`outing-artwork${large ? " large" : ""}`} data-kind={item.kind} data-photo={photo}>
      {photo ? (
        <Image src="/images/clayarch.jpg" alt="클레이아크 김해미술관 외관" width={large ? 720 : 120} height={large ? 480 : 120} unoptimized />
      ) : (
        <span className="outing-artwork-symbol" aria-hidden="true">
          <Icon name={item.kind === "MUSEUM" || item.kind === "CULTURAL_SITE" ? "landmark" : item.kind === "EXHIBITION" ? "spark" : "ticket"} />
          {large && <span>{kindNames[item.kind]}</span>}
        </span>
      )}
    </span>
  );
}

export function PhotoCredit() {
  return (
    <div className="photo-credit">
      <a className="source-link" href="https://commons.wikimedia.org/wiki/File:Clayarch_Gimhae_Museum.JPG" target="_blank" rel="noopener noreferrer">
        <span><strong>HappyMidnight · Wikimedia Commons</strong><small>사진 출처 · 2015</small></span>
        <span className="external-link-mark" aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
