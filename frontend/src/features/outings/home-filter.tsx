"use client";

import { useState } from "react";
import { ReviewDialog } from "@/components/ui/dialog";
import { kindNames } from "@/features/outings/model";
import { useReview } from "@/providers/review-provider";

export function HomeFilter() {
  const { params, items, closeSheet, replaceSheet } = useReview();
  const [region, setRegion] = useState(params.get("region") || "");
  const [kind, setKind] = useState(params.get("kind") || "");
  return (
    <ReviewDialog
      id="homeFilterDialog"
      open
      title="홈 필터"
      onClose={closeSheet}
      sheet
      className="policy-sheet filter-sheet"
    >
      <form
        className="filter-sheet-form"
        onSubmit={(event) => {
          event.preventDefault();
          const query = new URLSearchParams();
          if (region) query.set("region", region);
          if (kind) query.set("kind", kind);
          replaceSheet(`/${query.size ? `?${query}` : ""}`);
          requestAnimationFrame(() =>
            document
              .getElementById("homeFilterOpen")
              ?.focus({ preventScroll: true }),
          );
        }}
      >
        <div className="filter-sheet-fields">
          <div>
            <label htmlFor="homeFilterRegion">지역</label>
            <select
              id="homeFilterRegion"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
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
            <label htmlFor="homeFilterKind">종류</label>
            <select
              id="homeFilterKind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="">전체 종류</option>
              {Object.entries(kindNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                  {items.some((item) => item.kind === value)
                    ? ""
                    : " · 자료 확보 중"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-sheet-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setRegion("");
              setKind("");
            }}
          >
            초기화
          </button>
          <div className="row">
            <button type="button" className="text-button" onClick={closeSheet}>
              취소
            </button>
            <button className="button primary" type="submit">
              적용
            </button>
          </div>
        </div>
      </form>
    </ReviewDialog>
  );
}
