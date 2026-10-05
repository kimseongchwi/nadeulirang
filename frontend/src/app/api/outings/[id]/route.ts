import { getDetail } from "@/features/outings/api-server";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return Response.json({ message: "공개된 정보를 찾을 수 없어요." }, { status: 404 });
  const result = await getDetail(id);
  return Response.json(result.ok ? result.data : { message: result.message }, { status: result.ok ? 200 : result.status, headers: { "Cache-Control": "no-store" } });
}
