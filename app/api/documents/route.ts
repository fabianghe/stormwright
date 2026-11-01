import { createDocument, listDocuments } from "@/lib/documents";
import { fail, readJson, requireUser } from "@/lib/api";
import { isDocKind } from "@/lib/model";
import { getActiveProject } from "@/lib/projects";

export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const trash = new URL(request.url).searchParams.get("trash") === "1";
  const project = await getActiveProject(user.id);
  return Response.json({ documents: await listDocuments(user.id, project.id, trash) });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const user = await requireUser();
  if (user instanceof Response) return user;

  const kind = body.kind ?? "note";
  if (!isDocKind(kind)) return fail("Unknown document kind");
  const title = typeof body.title === "string" ? body.title.slice(0, 300) : "";
  const project = await getActiveProject(user.id);
  return Response.json({ document: await createDocument(user.id, project.id, kind, title) });
}
