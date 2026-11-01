import { collectVocab } from "@/lib/documents";
import { requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json({ vocab: await collectVocab(user.id) });
}
