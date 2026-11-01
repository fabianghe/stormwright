import { listVersions } from "@/lib/documents";
import { requireUser } from "@/lib/api";
import { getActiveProject } from "@/lib/projects";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const project = await getActiveProject(user.id);
  const versions = await listVersions(user.id, project.id, (await params).id);
  return Response.json({ versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })) });
}
