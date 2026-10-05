import { notFound } from "next/navigation";
import { DetailReview } from "@/features/outings/detail";
import { getDetail } from "@/features/outings/api-server";
import { QueryFeedback } from "@/features/outings/query-feedback";

export default async function DetailPage({
  params,
}: PageProps<"/detail/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const result = await getDetail(id);
  if (!result.ok && result.status === 404) notFound();
  return result.ok ? <DetailReview data={result.data} /> : <QueryFeedback status={result.status} message={result.message} />;
}
