import type { Detail, Evidence } from "./api-types";

export function detailRefreshNeeded(data: Detail, values: Evidence[]) {
  return values.some((entry) => entry.stale) || data.sources
    .filter((source) => values.some((entry) => entry.source === source.source && entry.sourceKey === source.sourceKey))
    .some((source) => source.stale || (source.lastFailureAt
      && (!source.checkedAt || Date.parse(source.lastFailureAt) >= Date.parse(source.checkedAt))));
}
