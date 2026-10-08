import { cache } from "react";
import type { ApiResult, Detail, Home, Options, Page } from "./api-types";
import { isDetail, isHome, isOptions, isPage } from "./api-contract";
import { queryFailure, requestJson } from "./api-request";

// 페이지와 서버 라우트에서만 백엔드 주소를 읽는다.
async function request<T>(path: string, validate: (value: unknown) => value is T): Promise<ApiResult<T>> {
  try {
    const base = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8080");
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error();
    return requestJson(new URL(`/api/outings${path}`, base), validate);
  } catch {
    return queryFailure();
  }
}
export const getOptions = cache(() => request<Options>("/options", isOptions));
export const getDetail = cache((id: string) => request<Detail>(`/${encodeURIComponent(id)}`, isDetail));
export function getPage(query: URLSearchParams) { return request<Page>(`?${query}`, isPage); }
export function getHome(query: URLSearchParams) { return request<Home>(`/home?${query}`, isHome); }
