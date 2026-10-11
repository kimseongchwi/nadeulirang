import { DetailScreen } from "./detail-screen";
import { detailResult } from "./detail-data";
import { QueryFeedback } from "@/features/outings/query-feedback";
import { pageMetadata } from "@/config/seo";
import { indexableOuting, outingMetadataText } from "@/features/outings/seo";

export async function generateMetadata({ params }: PageProps<"/detail/[id]">) {
  const { id } = await params;
  const result = await detailResult(id);
  if (!result.ok) return pageMetadata(undefined, "정보 조회 실패 · 나들이랑", "나들이 정보를 불러오지 못했어요.", false);
  const text = outingMetadataText(result.data.item);
  return pageMetadata(`/detail/${result.data.item.id.toLowerCase()}`, text.title, text.description, indexableOuting(result.data.item));
}

export default async function DetailPage({
  params,
}: PageProps<"/detail/[id]">) {
  const { id } = await params;
  const result = await detailResult(id);
  return result.ok ? <DetailScreen data={result.data} /> : <QueryFeedback status={result.status} message={result.message} />;
}
