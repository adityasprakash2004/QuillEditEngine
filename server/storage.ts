import { 
  documents, 
  snapshots, 
  comments,
  type Document, 
  type InsertDocument,
  type Snapshot,
  type InsertSnapshot,
  type Comment,
  type InsertComment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Snapshots
  getSnapshots(documentId: string): Promise<Snapshot[]>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  getLatestSnapshot(documentId: string): Promise<Snapshot | undefined>;
  
  // Comments
  getComments(documentId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, updates: Partial<InsertComment>): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Documents
  async getDocuments(): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .orderBy(desc(documents.updatedAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc || undefined;
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const [doc] = await db
      .insert(documents)
      .values(insertDoc)
      .returning();
    return doc;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [doc] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Snapshots
  async getSnapshots(documentId: string): Promise<Snapshot[]> {
    return await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.documentId, documentId))
      .orderBy(desc(snapshots.createdAt));
  }

  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    const [snap] = await db
      .insert(snapshots)
      .values(snapshot)
      .returning();
    return snap;
  }

  async getLatestSnapshot(documentId: string): Promise<Snapshot | undefined> {
    const [snap] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.documentId, documentId))
      .orderBy(desc(snapshots.createdAt))
      .limit(1);
    return snap || undefined;
  }

  // Comments
  async getComments(documentId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.documentId, documentId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [comm] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return comm;
  }

  async updateComment(id: string, updates: Partial<InsertComment>): Promise<Comment> {
    const [comm] = await db
      .update(comments)
      .set(updates)
      .where(eq(comments.id, id))
      .returning();
    return comm;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }
}

export const storage = new DatabaseStorage();
