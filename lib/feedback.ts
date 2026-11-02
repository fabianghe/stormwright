import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isFeedbackKind, type FeedbackEntry, type FeedbackKind } from "@/lib/model";

export async function isOwner(userId: string) {
  const db = await getDb();
  const [first] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .orderBy(asc(schema.users.createdAt), asc(schema.users.id))
    .limit(1);
  return first?.id === userId;
}

export async function addFeedback(userId: string, kind: FeedbackKind, message: string, path: string) {
  const db = await getDb();
  await db.insert(schema.feedback).values({ id: crypto.randomUUID(), userId, kind, message, path });
}

export async function listFeedback(): Promise<FeedbackEntry[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.feedback.id,
      username: schema.users.username,
      kind: schema.feedback.kind,
      message: schema.feedback.message,
      path: schema.feedback.path,
      done: schema.feedback.done,
      createdAt: schema.feedback.createdAt,
    })
    .from(schema.feedback)
    .innerJoin(schema.users, eq(schema.users.id, schema.feedback.userId))
    .orderBy(asc(schema.feedback.done), desc(schema.feedback.createdAt))
    .limit(500);
  return rows.map((row) => ({
    ...row,
    kind: isFeedbackKind(row.kind) ? row.kind : "other",
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function setFeedbackDone(id: string, done: boolean) {
  const db = await getDb();
  const rows = await db.update(schema.feedback).set({ done }).where(eq(schema.feedback.id, id)).returning({ id: schema.feedback.id });
  return rows.length > 0;
}

export async function deleteFeedback(id: string) {
  const db = await getDb();
  const rows = await db.delete(schema.feedback).where(eq(schema.feedback.id, id)).returning({ id: schema.feedback.id });
  return rows.length > 0;
}
