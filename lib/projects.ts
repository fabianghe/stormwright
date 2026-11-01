import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/lib/db";
import type { ProjectSummary } from "@/lib/model";

export const ACTIVE_PROJECT_COOKIE = "sw_project";

function toProject(row: typeof schema.projects.$inferSelect): ProjectSummary {
  return { id: row.id, name: row.name, position: row.position, createdAt: row.createdAt.toISOString() };
}

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const db = await getDb();
  let rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId))
    .orderBy(asc(schema.projects.position), asc(schema.projects.createdAt));

  if (rows.length === 0) {
    await db
      .insert(schema.projects)
      .values({ id: `default:${userId}`, userId, name: "My Game", position: 0 })
      .onConflictDoNothing();
    rows = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.userId, userId))
      .orderBy(asc(schema.projects.position), asc(schema.projects.createdAt));
  }

  return rows.map(toProject);
}

export async function getActiveProject(userId: string): Promise<ProjectSummary> {
  const [projects, jar] = await Promise.all([listProjects(userId), cookies()]);
  const selected = jar.get(ACTIVE_PROJECT_COOKIE)?.value;
  return projects.find((project) => project.id === selected) ?? projects[0];
}

export async function createProject(userId: string, name: string): Promise<ProjectSummary> {
  const projects = await listProjects(userId);
  const db = await getDb();
  const [row] = await db
    .insert(schema.projects)
    .values({ id: crypto.randomUUID(), userId, name, position: projects.length })
    .returning();
  return toProject(row);
}

export async function selectProject(userId: string, projectId: string): Promise<ProjectSummary | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)))
    .limit(1);
  if (!row) return null;

  (await cookies()).set(ACTIVE_PROJECT_COOKIE, row.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
  return toProject(row);
}