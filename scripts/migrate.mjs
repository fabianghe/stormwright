import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("[migrate] No DATABASE_URL set, skipping (the local database migrates itself).");
} else {
  await migrate(drizzle({ client: neon(url) }), { migrationsFolder: "drizzle" });
  console.log("[migrate] Database is up to date.");
}
