import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const SESSION_COOKIE = "sw_session";
const SESSION_DAYS = 30;
const SESSION_REFRESH_DAYS = 15;
const DAY = 24 * 60 * 60 * 1000;
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 };

export type CurrentUser = { id: string; username: string };

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.keyLength, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, n, r, p, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.insert(schema.sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * DAY),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const id = hashToken(token);
  const [row] = await db
    .select({
      expiresAt: schema.sessions.expiresAt,
      userId: schema.users.id,
      username: schema.users.username,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, id))
    .limit(1);

  if (!row) return null;

  const remaining = row.expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  if (remaining < SESSION_REFRESH_DAYS * DAY) {
    await db
      .update(schema.sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DAYS * DAY) })
      .where(eq(schema.sessions.id, id));
  }

  return { id: row.userId, username: row.username };
});

export async function hasAnyUser() {
  const db = await getDb();
  const rows = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  return rows.length > 0;
}

export async function signupAllowed() {
  return process.env.ALLOW_SIGNUP === "true" || !(await hasAnyUser());
}
