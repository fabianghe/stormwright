import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, readJson } from "@/lib/api";
import { getDb, schema } from "@/lib/db";

const MAX_FAILURES = 8;
const LOCK_MINUTES = 10;

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body instanceof Response) return body;

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const wrong = () => fail("Wrong username or password.", 401);

  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  if (!user) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return wrong();
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return fail(`Too many attempts. Try again in ${LOCK_MINUTES} minutes.`, 429);
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failures = user.failedLogins + 1;
    await db
      .update(schema.users)
      .set({
        failedLogins: failures >= MAX_FAILURES ? 0 : failures,
        lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(schema.users.id, user.id));
    return wrong();
  }

  if (user.failedLogins || user.lockedUntil) {
    await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
  }
  await createSession(user.id);
  return Response.json({ ok: true });
}
