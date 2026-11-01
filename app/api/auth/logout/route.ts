import { destroySession } from "@/lib/auth";
import { checkMutation } from "@/lib/api";

export async function POST(request: Request) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  await destroySession();
  return Response.json({ ok: true });
}
