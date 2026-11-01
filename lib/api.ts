import "server-only";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown> | Response> {
  if (!sameOrigin(request)) return fail("Cross-site request blocked", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return fail("Expected JSON", 415);
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : fail("Expected an object");
  } catch {
    return fail("Invalid JSON");
  }
}

export async function requireUser(): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  return user ?? fail("Not signed in", 401);
}

export function checkMutation(request: Request): Response | null {
  return sameOrigin(request) ? null : fail("Cross-site request blocked", 403);
}
