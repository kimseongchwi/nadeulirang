import { SearchReview } from "@/features/outings/search";
import { getOptions, getPage } from "@/features/outings/api-server";
import { backendQuery, parameters, queryParameters } from "@/features/outings/api-query";
import { QueryFeedback } from "@/features/outings/query-feedback";

export const metadata = { title: "검색 · 나들이랑" };
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const input = await searchParams;
  const options = await getOptions();
  if (!options.ok) return <QueryFeedback status={options.status} message={options.message} />;
  let query: URLSearchParams;
  try { query = queryParameters(parameters(input), options.data); }
  catch (error) { return <QueryFeedback status={400} message={error instanceof Error ? error.message : "조건을 확인해 주세요."} />; }
  const result = await getPage(backendQuery(query));
  return result.ok ? <SearchReview data={result.data} options={options.data} query={query.toString()} />
    : <QueryFeedback status={result.status} message={result.message} />;
}
