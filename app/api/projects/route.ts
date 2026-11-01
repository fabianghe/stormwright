import { checkMutation, fail, readJson, requireUser } from "@/lib/api";
import { createProject, selectProject } from "@/lib/projects";

export async function POST(request: Request) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const user = await requireUser();
  if (user instanceof Response) return user;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 80) return fail("Project names must be 1–80 characters.");

  const project = await createProject(user.id, name);
  await selectProject(user.id, project.id);
  return Response.json({ project }, { status: 201 });
}