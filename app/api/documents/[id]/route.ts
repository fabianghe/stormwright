import { deleteForever, getDocument, setDeleted, updateDocument, type DocumentPatch } from "@/lib/documents";
import { checkMutation, fail, readJson, requireUser } from "@/lib/api";
import { isDocKind, isDocStatus } from "@/lib/model";

type Context = { params: Promise<{ id: string }> };

const MAX_CONTENT_BYTES = 4 * 1024 * 1024;

export async function GET(_request: Request, { params }: Context) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const doc = await getDocument(user.id, (await params).id);
  return doc ? Response.json({ document: doc }) : fail("Not found", 404);
}

function finiteOrNull(value: unknown) {
  return value === null ? null : typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function PATCH(request: Request, { params }: Context) {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const user = await requireUser();
  if (user instanceof Response) return user;

  const patch: DocumentPatch = {};
  if (typeof body.title === "string") patch.title = body.title.slice(0, 300);
  if (isDocKind(body.kind)) patch.kind = body.kind;
  if (isDocStatus(body.status)) patch.status = body.status;
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  if (typeof body.position === "number" && Number.isFinite(body.position)) patch.position = body.position;
  if ("mapX" in body) patch.mapX = finiteOrNull(body.mapX);
  if ("mapY" in body) patch.mapY = finiteOrNull(body.mapY);
  if (body.snapshotBefore === true) patch.snapshotBefore = true;
  if ("content" in body) {
    const content = body.content as { type?: unknown } | null;
    if (!content || content.type !== "doc") return fail("Content must be a document");
    if (JSON.stringify(content).length > MAX_CONTENT_BYTES) return fail("This document is too large to save.", 413);
    patch.content = content;
  }

  const doc = await updateDocument(user.id, (await params).id, patch);
  return doc ? Response.json({ document: doc }) : fail("Not found", 404);
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = checkMutation(request);
  if (blocked) return blocked;
  const user = await requireUser();
  if (user instanceof Response) return user;

  const id = (await params).id;
  if (new URL(request.url).searchParams.get("forever") === "1") {
    return (await deleteForever(user.id, id)) ? Response.json({ ok: true }) : fail("Not found", 404);
  }
  const doc = await setDeleted(user.id, id, true);
  return doc ? Response.json({ document: doc }) : fail("Not found", 404);
}
