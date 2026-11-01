import { listVersions } from "@/lib/documents";
import { requireUser } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const versions = await listVersions(user.id, (await params).id);
  return Response.json({ versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })) });
}
