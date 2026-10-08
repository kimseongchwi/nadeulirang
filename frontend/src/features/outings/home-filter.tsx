"use client";

import { useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { kindNames } from "@/features/outings/model";
import { useNavigation } from "@/providers/navigation-provider";
import type { Options } from "./api-types";

export function HomeFilter({ open, options }: { open: boolean; options: Options }) {
  const { params, closeSheet, replaceSheet } = useNavigation();
  const region = params.get("region") || "";
  const regionCode = options?.regions.find((r) => r.code === region || r.name === region)?.code || region;
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (open) formRef.current?.reset();
  }, [open]);
  return (
    <Dialog
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
              defaultValue={regionCode}
            >
              <option value="">전체 지역</option>
              {regionCode && !options?.regions.some((r) => r.code === regionCode) && <option value={regionCode}>{region} · 확보한 자료 없음</option>}
              {options?.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
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
                  {options?.kinds.some((item) => item.code === value)
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
    </Dialog>
  );
}
