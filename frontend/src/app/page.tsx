import { HomeReview } from "@/features/outings/home";
import { getHome, getOptions } from "@/features/outings/api-server";
import { parameters, queryParameters, windowDays } from "@/features/outings/api-query";
import { QueryFeedback } from "@/features/outings/query-feedback";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const input = await searchParams;
  const options = await getOptions();
  if (!options.ok) return <QueryFeedback status={options.status} message={options.message} />;
  let query: URLSearchParams;
  let days: number;
  try {
    const parsed = parameters(input);
    query = queryParameters(parsed, options.data, true);
    days = windowDays(parsed.get("previewDays"));
  } catch (error) {
    return <QueryFeedback status={400} message={error instanceof Error ? error.message : "조건을 확인해 주세요."} />;
  }
  const request = new URLSearchParams(query);
  request.set("days", String(days));
  const result = await getHome(request);
  return result.ok ? <HomeReview data={result.data} options={options.data} query={query.toString()} />
    : <QueryFeedback status={result.status} message={result.message} />;
}
