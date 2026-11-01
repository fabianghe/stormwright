import { eq } from "drizzle-orm";
import { createSession, hashPassword, signupAllowed } from "@/lib/auth";
import { fail, readJson } from "@/lib/api";
import { getDb, schema } from "@/lib/db";

const USERNAME = /^[a-z0-9_.-]{3,32}$/;

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body instanceof Response) return body;

  if (!(await signupAllowed())) return fail("Sign-up is closed on this site.", 403);

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!USERNAME.test(username)) {
    return fail("Usernames are 3–32 characters: letters, numbers, dots, dashes or underscores.");
  }
  if (password.length < 8) return fail("Use a password of at least 8 characters.");
  if (password.length > 200) return fail("That password is too long.");

  const db = await getDb();
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, username));
  if (existing.length) return fail("That username is taken.", 409);

  const id = crypto.randomUUID();
  await db.insert(schema.users).values({ id, username, passwordHash: await hashPassword(password) });
  await createSession(id);
  return Response.json({ ok: true });
}
