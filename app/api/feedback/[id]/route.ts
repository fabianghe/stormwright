import { deleteFeedback, isOwner, setFeedbackDone } from "@/lib/feedback";
import { checkMutation, fail, readJson, requireUser } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!(await isOwner(user.id))) return fail("Not found", 404);
  if (typeof body.done !== "boolean") return fail("Expected done");
  return (await setFeedbackDone((await params).id, body.done)) ? Response.json({ ok: true }) : fail("Not found", 404);
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!(await isOwner(user.id))) return fail("Not found", 404);
  return (await deleteFeedback((await params).id)) ? Response.json({ ok: true }) : fail("Not found", 404);
}
