import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Documents table - stores document metadata
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull().default("Untitled Document"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Document snapshots - stores CRDT state snapshots for fast loading (base64 encoded)
export const snapshots = pgTable("snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Comments - inline document annotations
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  authorColor: text("author_color").notNull(),
  position: integer("position"),
  resolved: integer("resolved").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const documentsRelations = relations(documents, ({ many }) => ({
  snapshots: many(snapshots),
  comments: many(comments),
}));

export const snapshotsRelations = relations(snapshots, ({ one }) => ({
  document: one(documents, {
    fields: [snapshots.documentId],
    references: [documents.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  document: one(documents, {
    fields: [comments.documentId],
    references: [documents.id],
  }),
}));

// Zod schemas for validation
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Snapshot = typeof snapshots.$inferSelect;
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Presence/collaboration types (not stored in DB, only in-memory)
export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: {
    from: number;
    to: number;
  };
}
