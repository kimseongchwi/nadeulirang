"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icons";
import { kindNames, photoId, type Outing } from "@/features/outings/model";

export function OutingArtwork({ item, large = false }: { item: Outing; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = item.photo
    ? large ? item.photo.url : item.photo.thumbnailUrl || item.photo.url
    : !item.apiPeriod && item.id === photoId ? "/images/clayarch.jpg" : null;
  const photo = source !== null && source !== failedUrl;
  return (
    <span className={`outing-artwork${large ? " large" : ""}`} data-kind={item.kind} data-photo={photo}>
      {photo ? (
        <Image src={source!} alt={`${item.name} 사진`} width={large ? 720 : 120} height={large ? 480 : 120} unoptimized onError={() => setFailedUrl(source)} referrerPolicy="no-referrer" />
      ) : (
        <span className="outing-artwork-symbol" aria-hidden="true">
          <Icon name={item.kind === "MUSEUM" || item.kind === "CULTURAL_SITE" ? "landmark" : item.kind === "EXHIBITION" ? "spark" : "ticket"} />
          {large && <span>{kindNames[item.kind]}</span>}
        </span>
      )}
    </span>
  );
}
