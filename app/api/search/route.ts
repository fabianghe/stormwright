import { searchDocuments } from "@/lib/documents";
import { requireUser } from "@/lib/api";

export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) return Response.json({ results: [] });
  return Response.json({ results: await searchDocuments(user.id, query) });
}
