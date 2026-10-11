import { notFound } from "next/navigation";
import { getDetail } from "@/features/outings/api-server";
import { isOutingId } from "@/features/outings/seo";

export async function detailResult(id: string) {
  if (!isOutingId(id)) notFound();
  const result = await getDetail(id.toLowerCase());
  if (!result.ok && result.status === 404) notFound();
  return result;
}
