import { proxyBackendGet } from "../../_backendProxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(50, Math.max(1, Math.trunc(requestedLimit)))
    : 10;
  return proxyBackendGet(`/api/orchestration/history?limit=${limit}`);
}
