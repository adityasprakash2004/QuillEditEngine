import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import { storage } from "./storage";
import { insertDocumentSchema, insertCommentSchema } from "@shared/schema";

// Store Y.js documents in memory
const ydocs = new Map<string, Y.Doc>();
const docTimers = new Map<string, NodeJS.Timeout>();

// Get or create Y.js document
function getYDoc(documentId: string): Y.Doc {
  if (!ydocs.has(documentId)) {
    const ydoc = new Y.Doc();
    ydocs.set(documentId, ydoc);
    
    // Load latest snapshot if exists
    storage.getLatestSnapshot(documentId).then((snapshot) => {
      if (snapshot && snapshot.content) {
        const buffer = Buffer.from(snapshot.content, 'base64');
        const uint8Array = new Uint8Array(buffer);
        Y.applyUpdate(ydoc, uint8Array);
      }
    });

    // Schedule periodic snapshots
    scheduleSnapshot(documentId);
  }
  return ydocs.get(documentId)!;
}

// Schedule periodic snapshots
function scheduleSnapshot(documentId: string) {
  // Clear existing timer
  if (docTimers.has(documentId)) {
    clearTimeout(docTimers.get(documentId)!);
  }

  // Create snapshot every 60 seconds
  const timer = setTimeout(async () => {
    const ydoc = ydocs.get(documentId);
    if (ydoc) {
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Content = Buffer.from(state).toString('base64');
      await storage.createSnapshot({
        documentId,
        content: base64Content,
      });
      console.log(`Created snapshot for document ${documentId}`);
      scheduleSnapshot(documentId); // Schedule next snapshot
    }
  }, 60000);

  docTimers.set(documentId, timer);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Document routes
  app.get("/api/documents", async (_req, res) => {
    try {
      const docs = await storage.getDocuments();
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const data = insertDocumentSchema.parse(req.body);
      const doc = await storage.createDocument(data);
      res.json(doc);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(400).json({ error: "Failed to create document" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.updateDocument(req.params.id, req.body);
      res.json(doc);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      
      // Clean up Y.js document and timer
      if (ydocs.has(req.params.id)) {
        ydocs.delete(req.params.id);
      }
      if (docTimers.has(req.params.id)) {
        clearTimeout(docTimers.get(req.params.id)!);
        docTimers.delete(req.params.id);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Comment routes
  app.get("/api/documents/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/documents/:id/comments", async (req, res) => {
    try {
      // Don't validate documentId from body, use route param instead
      const data = {
        documentId: req.params.id,
        content: req.body.content,
        authorName: req.body.authorName,
        authorColor: req.body.authorColor,
        position: req.body.position || 0,
        resolved: 0,
      };
      const comment = await storage.createComment(data);
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(400).json({ error: "Failed to create comment" });
    }
  });

  app.patch("/api/documents/:id/comments/:commentId", async (req, res) => {
    try {
      const comment = await storage.updateComment(req.params.commentId, req.body);
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/documents/:id/comments/:commentId", async (req, res) => {
    try {
      await storage.deleteComment(req.params.commentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Snapshot routes
  app.get("/api/documents/:id/snapshots", async (req, res) => {
    try {
      const snapshots = await storage.getSnapshots(req.params.id);
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for Y.js collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log("New WebSocket connection");

    let currentRoom: string | null = null;
    let currentDoc: Y.Doc | null = null;

    ws.on("message", (message: Buffer) => {
      try {
        const uint8Array = new Uint8Array(message);
        const messageType = uint8Array[0];

        // Message type 0 is sync protocol
        if (messageType === 0) {
          // Extract room name from first message
          if (!currentRoom) {
            // Parse the sync message to get room name
            const decoder = { pos: 1, arr: uint8Array };
            const syncMessageType = readVarUint(decoder);
            
            if (syncMessageType === 0) { // Sync step 1
              // Room name is encoded in the message
              const roomLength = readVarUint(decoder);
              const roomBytes = uint8Array.slice(decoder.pos, decoder.pos + roomLength);
              currentRoom = new TextDecoder().decode(roomBytes);
              
              // Get or create Y.js document for this room
              const documentId = currentRoom.replace("document-", "");
              currentDoc = getYDoc(documentId);
              
              console.log(`Client joined room: ${currentRoom}`);
            }
          }

          if (currentDoc) {
            // Apply update to Y.js document
            const update = uint8Array.slice(1);
            Y.applyUpdate(currentDoc, update);

            // Broadcast to all other clients in the same room
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
              }
            });
          }
        }
        // Message type 1 is awareness protocol
        else if (messageType === 1) {
          // Broadcast awareness updates to all clients
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Send initial sync
    ws.send(new Uint8Array([0, 0, 1, 0])); // Sync step 1 request
  });

  return httpServer;
}

// Helper function to read variable-length unsigned integer
function readVarUint(decoder: { pos: number; arr: Uint8Array }): number {
  let num = 0;
  let mult = 1;
  const len = decoder.arr.length;
  while (decoder.pos < len) {
    const r = decoder.arr[decoder.pos++];
    num = num + (r & 127) * mult;
    mult *= 128;
    if (r < 128) {
      return num;
    }
  }
  return num;
}
