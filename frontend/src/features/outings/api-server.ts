import { cache } from "react";
import type { ApiResult, Detail, Home, Options, Page } from "./api-types";
import { isDetail, isHome, isOptions, isPage } from "./api-contract";

// 페이지와 서버 라우트에서만 백엔드 주소를 읽는다.
async function request<T>(path: string, validate: (value: unknown) => value is T): Promise<ApiResult<T>> {
  try {
    const base = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8080");
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error();
    const response = await fetch(new URL(`/api/outings${path}`, base), {
      cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error",
    });
    if (!response.ok) return { ok: false, status: response.status === 404 ? 404 : response.status === 400 ? 400 : 503,
      message: response.status === 404 ? "공개된 정보를 찾을 수 없어요." : response.status === 400 ? "검색 조건을 확인해 주세요." : "나들이 정보를 불러오지 못했어요." };
    const data: unknown = await response.json();
    if (!validate(data)) throw new Error();
    return { ok: true, data };
  } catch { return { ok: false, status: 503, message: "나들이 정보를 불러오지 못했어요." }; }
}
export const getOptions = cache(() => request<Options>("/options", isOptions));
export const getDetail = cache((id: string) => request<Detail>(`/${encodeURIComponent(id)}`, isDetail));
export function getPage(query: URLSearchParams) { return request<Page>(`?${query}`, isPage); }
export function getHome(query: URLSearchParams) { return request<Home>(`/home?${query}`, isHome); }
