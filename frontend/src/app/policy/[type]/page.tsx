import { notFound } from "next/navigation";
import { isPolicyType } from "@/features/policies/model";
import { PolicyReview } from "@/features/policies/policy-page";

export default async function PolicyPage({
  params,
}: PageProps<"/policy/[type]">) {
  const { type } = await params;
  if (!isPolicyType(type)) notFound();
  return <PolicyReview type={type} />;
}
