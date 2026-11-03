import { boolean, doublePrecision, index, integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import type { DocLink, DocStats, VocabEntry } from "@/lib/model";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  failedLogins: integer("failed_logins").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
});

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: doublePrecision("position").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("projects_user_idx").on(t.userId, t.position)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    kind: text("kind").default("note").notNull(),
    status: text("status").default("idea").notNull(),
    color: text("color"),
    content: jsonb("content"),
    pinned: boolean("pinned").default(false).notNull(),
    position: doublePrecision("position").default(0).notNull(),
    links: jsonb("links").$type<DocLink[]>().default([]).notNull(),
    vocab: jsonb("vocab").$type<VocabEntry[]>().default([]).notNull(),
    stats: jsonb("stats").$type<DocStats>().default({ words: 0, stages: 0, lines: 0, actions: 0 }).notNull(),
    searchText: text("search_text").default("").notNull(),
    mapX: real("map_x"),
    mapY: real("map_y"),
    mapLinks: jsonb("map_links").$type<string[]>().default([]).notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("documents_user_idx").on(t.userId, t.updatedAt),
    index("documents_project_idx").on(t.projectId, t.updatedAt),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    content: jsonb("content"),
    createdAt: createdAt(),
  },
  (t) => [index("versions_document_idx").on(t.documentId, t.createdAt)],
);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").default("idea").notNull(),
    message: text("message").notNull(),
    path: text("path").default("").notNull(),
    done: boolean("done").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt)],
);
