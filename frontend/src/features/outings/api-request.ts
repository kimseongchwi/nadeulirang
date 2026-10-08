import type { ApiResult } from "./api-types";

export function queryFailure(status = 503) {
  const code = status === 404 ? 404 : status === 400 ? 400 : 503;
  return {
    ok: false as const,
    status: code,
    message: code === 404 ? "공개된 정보를 찾을 수 없어요."
      : code === 400 ? "검색 조건을 확인해 주세요." : "나들이 정보를 불러오지 못했어요.",
  };
}

// 서버 페이지와 브라우저 시트가 같은 계약 검사를 사용한다. 오류 본문은 화면에 직접 노출하지 않는다.
export async function requestJson<T>(
  url: string | URL,
  validate: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  try {
    const timeout = AbortSignal.timeout(8000);
    const response = await fetch(url, {
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: "error",
    });
    if (!response.ok) return queryFailure(response.status);
    const data: unknown = await response.json();
    return validate(data) ? { ok: true, data } : queryFailure();
  } catch {
    return queryFailure();
  }
}
