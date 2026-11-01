import { getVersion } from "@/lib/documents";
import { fail, requireUser } from "@/lib/api";
import { getActiveProject } from "@/lib/projects";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id, versionId } = await params;
  const project = await getActiveProject(user.id);
  const version = await getVersion(user.id, project.id, id, versionId);
  return version
    ? Response.json({ version: { ...version, createdAt: version.createdAt.toISOString() } })
    : fail("Not found", 404);
}
