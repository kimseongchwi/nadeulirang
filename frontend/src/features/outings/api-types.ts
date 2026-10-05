export type Photo = {
  id: string; url: string; thumbnailUrl: string | null; provider: string;
  attributionUrl: string; license: "KOGL1"; checkedAt: string;
};
export type Summary = {
  id: string; name: string; kind: string; regionCode: string; regionName: string;
  period: string; eventStart: string | null; eventEnd: string | null;
  feeStatus: string; adultFee: number | null; feeConflict: boolean;
  operationVerified: boolean; collectedAt: string | null; sourceCheckedAt: string | null;
  photo: Photo | null;
};
export type Page = { items: Summary[]; page: number; pageSize: number; total: number; asOfDate: string };
export type Home = { ongoing: Summary[]; upcoming: Summary[]; permanent: Summary[]; total: number; days: number; asOfDate: string };
export type Options = {
  regions: { code: string; name: string; count: number }[];
  kinds: { code: string; count: number }[]; total: number; asOfDate: string;
};
export type Evidence = {
  field: string; value: string; source: string; sourceKey: string; url: string;
  sourceReference: string | null; collectedAt: string; checkedAt: string;
  stale: boolean; observationId: string;
};
export type SourceInfo = {
  source: string; sourceKey: string; url: string; license: string;
  collectedAt: string | null; checkedAt: string | null;
  lastFailureAt: string | null; lastFailureCode: string | null; stale: boolean;
};
export type Detail = {
  item: Summary; sources: SourceInfo[]; information: Record<string, Evidence[]>;
  links: { purpose: string; url: string; evidence: Evidence }[];
  unconfirmed: string[]; asOfDate: string;
};
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };
