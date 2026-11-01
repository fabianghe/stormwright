import { collectVocab } from "@/lib/documents";
import { requireUser } from "@/lib/api";
import { getActiveProject } from "@/lib/projects";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const project = await getActiveProject(user.id);
  return Response.json({ vocab: await collectVocab(user.id, project.id) });
}
