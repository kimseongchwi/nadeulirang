import { GuideReview } from "@/features/ui-design/guide";
import { getPage } from "@/features/outings/api-server";

export const metadata = {
  title: "UI 디자인 가이드 · 나들이랑",
  robots: { index: false, follow: false },
};
export default async function GuidePage() {
  const adPreview = await getPage(new URLSearchParams());
  return <GuideReview adPreview={adPreview} />;
}
