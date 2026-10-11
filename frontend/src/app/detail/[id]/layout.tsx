import { detailResult } from "./detail-data";

// loading.tsx의 스트리밍 경계 바깥에서 공개 여부를 확인한다.
export default async function DetailLayout({ children, params }: LayoutProps<"/detail/[id]">) {
  const { id } = await params;
  await detailResult(id);
  return children;
}
