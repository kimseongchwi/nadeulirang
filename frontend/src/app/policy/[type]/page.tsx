import { notFound } from "next/navigation";
import { isPolicyType } from "@/features/policies/model";
import { PolicyScreen } from "./policy-screen";

export default async function PolicyPage({
  params,
  searchParams,
}: PageProps<"/policy/[type]">) {
  const { type } = await params;
  if (!isPolicyType(type)) notFound();
  const query = await searchParams;
  return <PolicyScreen type={type} samplePhoto={type === "about" && query.sample === "clayarch"} />;
}
