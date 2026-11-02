import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, isNull, min } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { extractMeta } from "@/lib/content";
import { templateFor } from "@/lib/templates";
import { isCharacterColor, type DocKind, type DocSummary, type FullDoc, type VocabEntry } from "@/lib/model";

const VERSION_EVERY_MS = 10 * 60 * 1000;
const MAX_VERSIONS = 60;

const summaryColumns = {
  id: schema.documents.id,
  title: schema.documents.title,
  kind: schema.documents.kind,
  status: schema.documents.status,
  color: schema.documents.color,
  pinned: schema.documents.pinned,
  position: schema.documents.position,
  updatedAt: schema.documents.updatedAt,
  links: schema.documents.links,
  stats: schema.documents.stats,
  mapX: schema.documents.mapX,
  mapY: schema.documents.mapY,
};

type SummaryRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  color: string | null;
  pinned: boolean;
  position: number;
  updatedAt: Date;
  links: DocSummary["links"];
  stats: DocSummary["stats"];
  mapX: number | null;
  mapY: number | null;
};

function toSummary(row: SummaryRow): DocSummary {
  return {
    ...row,
    kind: row.kind as DocSummary["kind"],
    status: row.status as DocSummary["status"],
    color: isCharacterColor(row.color) ? row.color : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const owned = (userId: string, projectId: string, id: string) =>
  and(eq(schema.documents.id, id), eq(schema.documents.userId, userId), eq(schema.documents.projectId, projectId));

export async function listDocuments(userId: string, projectId: string, trash = false): Promise<DocSummary[]> {
  const db = await getDb();
  const rows = await db
    .select(summaryColumns)
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, userId),
        eq(schema.documents.projectId, projectId),
        trash ? isNotNull(schema.documents.deletedAt) : isNull(schema.documents.deletedAt),
      ),
    )
    .orderBy(asc(schema.documents.position), desc(schema.documents.updatedAt));
  return rows.map(toSummary);
}

export async function listFullDocuments(userId: string, projectId: string): Promise<FullDoc[]> {
  const db = await getDb();
  const rows = await db
    .select({
      ...summaryColumns,
      content: schema.documents.content,
      createdAt: schema.documents.createdAt,
      deletedAt: schema.documents.deletedAt,
    })
    .from(schema.documents)
    .where(and(eq(schema.documents.userId, userId), eq(schema.documents.projectId, projectId), isNull(schema.documents.deletedAt)))
    .orderBy(asc(schema.documents.position), desc(schema.documents.updatedAt));
  return rows.map((row) => ({
    ...toSummary(row),
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  }));
}

export async function getDocument(userId: string, projectId: string, id: string): Promise<FullDoc | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      ...summaryColumns,
      content: schema.documents.content,
      createdAt: schema.documents.createdAt,
      deletedAt: schema.documents.deletedAt,
    })
    .from(schema.documents)
    .where(owned(userId, projectId, id))
    .limit(1);
  if (!row) return null;
  return {
    ...toSummary(row),
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

export async function createDocument(userId: string, projectId: string, kind: DocKind, title = ""): Promise<DocSummary> {
  const db = await getDb();
  const content = templateFor(kind);
  const meta = extractMeta(title, content);
  const [top] = await db
    .select({ value: min(schema.documents.position) })
    .from(schema.documents)
    .where(and(eq(schema.documents.userId, userId), eq(schema.documents.kind, kind)));
  const [row] = await db
    .insert(schema.documents)
    .values({
      id: crypto.randomUUID(),
      userId,
      projectId,
      kind,
      position: (top?.value ?? 1) - 1,
      title,
      content,
      links: meta.links,
      vocab: meta.vocab,
      stats: meta.stats,
      searchText: meta.searchText,
    })
    .returning(summaryColumns);
  return toSummary(row);
}

export type DocumentPatch = {
  title?: string;
  kind?: DocKind;
  status?: DocSummary["status"];
  color?: DocSummary["color"];
  pinned?: boolean;
  position?: number;
  content?: unknown;
  mapX?: number | null;
  mapY?: number | null;
  snapshotBefore?: boolean;
};

export async function updateDocument(userId: string, projectId: string, id: string, patch: DocumentPatch): Promise<DocSummary | null> {
  const db = await getDb();
  const [current] = await db
    .select({ title: schema.documents.title, content: schema.documents.content })
    .from(schema.documents)
    .where(owned(userId, projectId, id))
    .limit(1);
  if (!current) return null;

  const values: Partial<typeof schema.documents.$inferInsert> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.kind !== undefined) values.kind = patch.kind;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.color !== undefined) values.color = patch.color;
  if (patch.pinned !== undefined) values.pinned = patch.pinned;
  if (patch.position !== undefined) values.position = patch.position;
  if (patch.mapX !== undefined) values.mapX = patch.mapX;
  if (patch.mapY !== undefined) values.mapY = patch.mapY;

  const textChanged = patch.content !== undefined || patch.title !== undefined;
  if (textChanged) {
    const title = patch.title ?? current.title;
    const content = patch.content !== undefined ? patch.content : current.content;
    const meta = extractMeta(title, content);
    if (patch.content !== undefined) values.content = patch.content;
    values.links = meta.links;
    values.vocab = meta.vocab;
    values.stats = meta.stats;
    values.searchText = meta.searchText;
    values.updatedAt = new Date();
  } else if (patch.status !== undefined || patch.kind !== undefined) {
    values.updatedAt = new Date();
  }

  if (patch.snapshotBefore) {
    await insertVersion(id, current.title, current.content);
  }

  const [row] = await db.update(schema.documents).set(values).where(owned(userId, projectId, id)).returning(summaryColumns);

  if (patch.content !== undefined) {
    await maybeSnapshot(id, row.title, patch.content, patch.snapshotBefore === true);
  }
  return toSummary(row);
}

async function insertVersion(documentId: string, title: string, content: unknown) {
  const db = await getDb();
  await db.insert(schema.documentVersions).values({ id: crypto.randomUUID(), documentId, title, content });
}

async function maybeSnapshot(documentId: string, title: string, content: unknown, force: boolean) {
  const db = await getDb();
  const versions = await db
    .select({ id: schema.documentVersions.id, createdAt: schema.documentVersions.createdAt })
    .from(schema.documentVersions)
    .where(eq(schema.documentVersions.documentId, documentId))
    .orderBy(desc(schema.documentVersions.createdAt));

  const latest = versions[0];
  if (force || !latest || Date.now() - latest.createdAt.getTime() > VERSION_EVERY_MS) {
    await insertVersion(documentId, title, content);
    for (const old of versions.slice(MAX_VERSIONS - 1)) {
      await db.delete(schema.documentVersions).where(eq(schema.documentVersions.id, old.id));
    }
  }
}

export async function setDeleted(userId: string, projectId: string, id: string, deleted: boolean) {
  const db = await getDb();
  const rows = await db
    .update(schema.documents)
    .set({ deletedAt: deleted ? new Date() : null, pinned: deleted ? false : undefined })
    .where(owned(userId, projectId, id))
    .returning(summaryColumns);
  return rows[0] ? toSummary(rows[0]) : null;
}

export async function deleteForever(userId: string, projectId: string, id: string) {
  const db = await getDb();
  const rows = await db
    .delete(schema.documents)
    .where(and(owned(userId, projectId, id), isNotNull(schema.documents.deletedAt)))
    .returning({ id: schema.documents.id });
  return rows.length > 0;
}

export async function listVersions(userId: string, projectId: string, id: string) {
  const db = await getDb();
  return db
    .select({ id: schema.documentVersions.id, title: schema.documentVersions.title, createdAt: schema.documentVersions.createdAt })
    .from(schema.documentVersions)
    .innerJoin(schema.documents, eq(schema.documents.id, schema.documentVersions.documentId))
    .where(owned(userId, projectId, id))
    .orderBy(desc(schema.documentVersions.createdAt));
}

export async function getVersion(userId: string, projectId: string, id: string, versionId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      id: schema.documentVersions.id,
      title: schema.documentVersions.title,
      content: schema.documentVersions.content,
      createdAt: schema.documentVersions.createdAt,
    })
    .from(schema.documentVersions)
    .innerJoin(schema.documents, eq(schema.documents.id, schema.documentVersions.documentId))
    .where(and(owned(userId, projectId, id), eq(schema.documentVersions.id, versionId)))
    .limit(1);
  return row ?? null;
}

export async function collectVocab(userId: string, projectId: string): Promise<VocabEntry[]> {
  const db = await getDb();
  const rows = await db
    .select({ vocab: schema.documents.vocab })
    .from(schema.documents)
    .where(and(eq(schema.documents.userId, userId), eq(schema.documents.projectId, projectId), isNull(schema.documents.deletedAt)));
  const merged = new Map<string, VocabEntry>();
  for (const row of rows) {
    for (const entry of row.vocab) merged.set(`${entry.kind}:${entry.text.toLowerCase()}`, entry);
  }
  return [...merged.values()].sort((a, b) => a.text.localeCompare(b.text));
}

export async function searchDocuments(userId: string, projectId: string, query: string) {
  const db = await getDb();
  const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db
    .select({ id: schema.documents.id, title: schema.documents.title, kind: schema.documents.kind, text: schema.documents.searchText })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, userId),
        eq(schema.documents.projectId, projectId),
        isNull(schema.documents.deletedAt),
        ilike(schema.documents.searchText, pattern),
      ),
    )
    .orderBy(desc(schema.documents.updatedAt))
    .limit(20);

  const needle = query.toLowerCase();
  return rows.map((row) => {
    const at = row.text.toLowerCase().indexOf(needle);
    const start = Math.max(0, at - 40);
    const snippet = at >= 0 ? `${start > 0 ? "…" : ""}${row.text.slice(start, at + needle.length + 60)}…` : "";
    return { id: row.id, title: row.title, kind: row.kind, snippet };
  });
}
