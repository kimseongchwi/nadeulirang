import { notFound } from "next/navigation";
import { isPolicyType } from "@/features/policies/model";
import { PolicyScreen } from "./policy-screen";

export default async function PolicyPage({
  params,
}: PageProps<"/policy/[type]">) {
  const { type } = await params;
  if (!isPolicyType(type)) notFound();
  return <PolicyScreen type={type} />;
}
