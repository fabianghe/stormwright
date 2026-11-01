import { checkMutation, fail, requireUser } from "@/lib/api";
import { selectProject } from "@/lib/projects";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  const user = await requireUser();
  if (user instanceof Response) return user;
  const project = await selectProject(user.id, (await params).id);
  return project ? Response.json({ project }) : fail("Project not found.", 404);
}