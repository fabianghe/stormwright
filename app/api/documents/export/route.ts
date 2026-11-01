import { requireUser } from "@/lib/api";
import { listFullDocuments } from "@/lib/documents";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json({ documents: await listFullDocuments(user.id) });
}