import { proxyAuth } from "@/features/auth/proxy";

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyAuth(request, (await params).path.join("/"));
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const PATCH = handle;
