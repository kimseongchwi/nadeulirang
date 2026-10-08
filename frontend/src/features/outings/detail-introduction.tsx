"use client";

import type { Evidence } from "./api-types";
import { ExpandableDetailText } from "./expandable-detail-text";

export function DetailIntroduction({ values }: { values: Evidence[] }) {
  return <section className="detail-section">
    <h2>소개</h2>
    <ExpandableDetailText values={values} />
  </section>;
}
