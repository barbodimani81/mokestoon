import type { paths } from "./schema";

type Ready =
  paths["/health/ready"]["get"]["responses"][200]["content"]["application/json"];

export async function checkReadiness(
  request: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await request("/api/v1/health/ready", {
      signal: AbortSignal.timeout(3500),
      cache: "no-store",
    });
    if (response.status !== 200) return false;
    const body: Partial<Ready> | null = await response.json();
    return body?.status === "ready";
  } catch {
    return false;
  }
}
