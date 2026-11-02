import { addFeedback } from "@/lib/feedback";
import { fail, readJson, requireUser } from "@/lib/api";
import { isFeedbackKind } from "@/lib/model";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const user = await requireUser();
  if (user instanceof Response) return user;

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (!message) return fail("Please write a message");
  const kind = isFeedbackKind(body.kind) ? body.kind : "other";
  const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
  await addFeedback(user.id, kind, message, path);
  return Response.json({ ok: true });
}
