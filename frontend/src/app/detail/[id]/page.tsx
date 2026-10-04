import { notFound } from "next/navigation";
import { reviewItems } from "@/features/outings/model";
import { DetailReview } from "@/features/outings/detail";

export default async function DetailPage({
  params,
}: PageProps<"/detail/[id]">) {
  const { id } = await params;
  const item = reviewItems.find((item) => item.id === id);
  if (!item) notFound();
  return <DetailReview item={item} />;
}
