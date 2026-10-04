"use client";

import { useEffect, useRef } from "react";
import { ReviewDialog } from "@/components/ui/dialog";
import { kindNames } from "@/features/outings/model";
import { useReview } from "@/providers/review-provider";

export function HomeFilter({ open }: { open: boolean }) {
  const { params, items, closeSheet, replaceSheet } = useReview();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (open) formRef.current?.reset();
  }, [open]);
  return (
    <ReviewDialog
      id="homeFilterDialog"
      open={open}
      title="홈 필터"
      onClose={closeSheet}
      sheet
      className="policy-sheet filter-sheet"
    >
      <form
        ref={formRef}
        key={params.toString()}
        className="filter-sheet-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const region = String(data.get("region") || "");
          const kind = String(data.get("kind") || "");
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
              name="region"
              defaultValue={params.get("region") || ""}
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
              name="kind"
              defaultValue={params.get("kind") || ""}
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
              if (formRef.current) {
                for (const select of formRef.current.querySelectorAll("select"))
                  select.value = "";
              }
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
