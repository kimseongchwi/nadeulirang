import { SearchScreen } from "./search-screen";
import { getOptions, getPage } from "@/features/outings/api-server";
import { backendQuery, parameters, queryParameters } from "@/features/outings/api-query";
import { QueryFeedback } from "@/features/outings/query-feedback";
import { pageMetadata } from "@/config/seo";
import { kindNames } from "@/features/outings/model";

export async function generateMetadata({ searchParams }: PageProps<"/search">) {
  const input = await searchParams;
  const options = await getOptions();
  if (!options.ok) return pageMetadata(undefined, "정보 조회 실패 · 나들이랑", "나들이 정보를 불러오지 못했어요.", false);
  try {
    const query = queryParameters(parameters(input), options.data);
    const result = await getPage(backendQuery(query));
    if (!result.ok) return pageMetadata(undefined, "정보 조회 실패 · 나들이랑", "나들이 정보를 불러오지 못했어요.", false);
    const region = options.data.regions.find((item) => item.code === query.get("region"))?.name;
    const kind = kindNames[query.get("kind") || ""];
    const context = [region, kind].filter(Boolean).join(" · ");
    return pageMetadata(undefined, `${context ? `${context} ` : ""}검색 · 나들이랑`,
      "이름과 지역, 종류로 나들이를 찾고 일정과 방문 정보를 확인하세요.", false);
  } catch {
    return pageMetadata(undefined, "검색 조건 확인 · 나들이랑", "나들이 검색 조건을 확인해 주세요.", false);
  }
}
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const input = await searchParams;
  const options = await getOptions();
  if (!options.ok) return <QueryFeedback status={options.status} message={options.message} />;
  let query: URLSearchParams;
  try { query = queryParameters(parameters(input), options.data); }
  catch (error) { return <QueryFeedback status={400} message={error instanceof Error ? error.message : "조건을 확인해 주세요."} />; }
  const result = await getPage(backendQuery(query));
  return result.ok ? <SearchScreen data={result.data} options={options.data} query={query.toString()} />
    : <QueryFeedback status={result.status} message={result.message} />;
}
