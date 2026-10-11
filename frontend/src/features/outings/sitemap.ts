import type { ApiResult, Page } from "./api-types.ts";
import { indexableOuting, isOutingId } from "./seo.ts";

// 실패·중복·조회 중 목록 변경을 정상 빈 사이트맵으로 발행하지 않는다.
export async function sitemapOutingIds(load: (query: URLSearchParams) => Promise<ApiResult<Page>>) {
  const ids = new Set<string>();
  let total: number | undefined;
  let asOfDate: string | undefined;
  for (let page = 1; ; page++) {
    const result = await load(new URLSearchParams({ page: String(page), sort: "NAME" }));
    if (!result.ok) throw new Error("사이트맵 목록 조회 실패");
    const data = result.data;
    total ??= data.total;
    asOfDate ??= data.asOfDate;
    if (total > 49900 || data.total !== total || data.asOfDate !== asOfDate || data.page !== page ||
      data.items.length !== Math.min(data.pageSize, Math.max(0, total - (page - 1) * data.pageSize)))
      throw new Error("사이트맵 목록 변경 또는 한도 초과");
    for (const item of data.items) {
      const id = item.id.toLowerCase();
      if (!isOutingId(id) || !indexableOuting(item) || ids.has(id)) throw new Error("사이트맵 공개 목록 불일치");
      ids.add(id);
    }
    if (ids.size === total) return [...ids];
  }
}
