import { HomeScreen } from "./home-screen";
import { getHome, getOptions } from "@/features/outings/api-server";
import { parameters, queryParameters, windowDays } from "@/features/outings/api-query";
import { QueryFeedback } from "@/features/outings/query-feedback";
import { pageMetadata } from "@/config/seo";
import { kindNames } from "@/features/outings/model";

export async function generateMetadata({ searchParams }: PageProps<"/">) {
  const input = await searchParams;
  const options = await getOptions();
  if (!options.ok)
    return pageMetadata(
      undefined,
      "정보 조회 실패 · 나들이랑",
      "나들이 정보를 불러오지 못했어요.",
      false,
    );
  try {
    const parsed = parameters(input);
    const query = queryParameters(parsed, options.data, true);
    const request = new URLSearchParams(query);
    request.set("days", String(windowDays(parsed.get("previewDays"))));
    const result = await getHome(request);
    if (!result.ok)
      return pageMetadata(
        undefined,
        "정보 조회 실패 · 나들이랑",
        "나들이 정보를 불러오지 못했어요.",
        false,
      );
    const region = options.data.regions.find((item) => item.code === query.get("region"))?.name;
    const kind = kindNames[query.get("kind") || ""];
    const context = [region, kind].filter(Boolean).join(" · ");
    return pageMetadata(
      Object.keys(input).length ? undefined : "/",
      `${context ? `${context} 나들이` : "나들이 발견"} · 나들이랑`,
      "축제·행사·전시·박물관·문화관광지를 발견하고 일정과 요금, 공식 방문 정보를 확인하세요.",
      Object.keys(input).length === 0,
    );
  } catch {
    return pageMetadata(
      undefined,
      "검색 조건 확인 · 나들이랑",
      "나들이 검색 조건을 확인해 주세요.",
      false,
    );
  }
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const input = await searchParams;
  const options = await getOptions();
  if (!options.ok)
    return (
      <QueryFeedback
        status={options.status}
        message={options.message}
      />
    );
  let query: URLSearchParams;
  let days: number;
  try {
    const parsed = parameters(input);
    query = queryParameters(parsed, options.data, true);
    days = windowDays(parsed.get("previewDays"));
  } catch (error) {
    return (
      <QueryFeedback
        status={400}
        message={error instanceof Error ? error.message : "조건을 확인해 주세요."}
      />
    );
  }
  const request = new URLSearchParams(query);
  request.set("days", String(days));
  const result = await getHome(request);
  return result.ok ? (
    <HomeScreen
      data={result.data}
      options={options.data}
      query={query.toString()}
    />
  ) : (
    <QueryFeedback
      status={result.status}
      message={result.message}
    />
  );
}
