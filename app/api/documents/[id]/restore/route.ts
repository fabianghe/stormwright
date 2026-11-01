import { setDeleted } from "@/lib/documents";
import { checkMutation, fail, requireUser } from "@/lib/api";
import { getActiveProject } from "@/lib/projects";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  const user = await requireUser();
  if (user instanceof Response) return user;
  const project = await getActiveProject(user.id);
  const doc = await setDeleted(user.id, project.id, (await params).id, false);
  return doc ? Response.json({ document: doc }) : fail("Not found", 404);
}
