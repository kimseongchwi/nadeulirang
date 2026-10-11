import { notFound } from "next/navigation";
import { isPolicyType, policyTitles } from "@/features/policies/model";
import { PolicyScreen } from "./policy-screen";
import { pageMetadata } from "@/config/seo";

export async function generateMetadata({ params, searchParams }: PageProps<"/policy/[type]">) {
  const { type } = await params;
  if (!isPolicyType(type)) notFound();
  const query = await searchParams;
  return pageMetadata(`/policy/${type}`, `${policyTitles[type]} · 나들이랑`,
    type === "about" ? "나들이랑의 데이터·사진 출처와 이용 조건을 확인하세요." : "공개 운영 정책 작성 전 확인할 검토 안내입니다.",
    type === "about" && Object.keys(query).length === 0);
}

export default async function PolicyPage({
  params,
  searchParams,
}: PageProps<"/policy/[type]">) {
  const { type } = await params;
  if (!isPolicyType(type)) notFound();
  const query = await searchParams;
  return <PolicyScreen type={type} samplePhoto={type === "about" && query.sample === "clayarch"} />;
}
