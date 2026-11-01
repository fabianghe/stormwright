import { requireUser } from "@/lib/api";
import { listFullDocuments } from "@/lib/documents";
import { getActiveProject } from "@/lib/projects";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const project = await getActiveProject(user.id);
  return Response.json({ project, documents: await listFullDocuments(user.id, project.id) });
}