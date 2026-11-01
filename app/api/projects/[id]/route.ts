import { checkMutation, fail, readJson, requireUser } from "@/lib/api";
import { renameProject } from "@/lib/projects";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const user = await requireUser();
  if (user instanceof Response) return user;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 80) return fail("Project names must be 1–80 characters.");

  const project = await renameProject(user.id, (await params).id, name);
  return project ? Response.json({ project }) : fail("Project not found.", 404);
}
