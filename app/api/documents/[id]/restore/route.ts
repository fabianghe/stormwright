import { setDeleted } from "@/lib/documents";
import { checkMutation, fail, requireUser } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  const user = await requireUser();
  if (user instanceof Response) return user;
  const doc = await setDeleted(user.id, (await params).id, false);
  return doc ? Response.json({ document: doc }) : fail("Not found", 404);
}
