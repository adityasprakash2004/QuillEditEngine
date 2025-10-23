import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { EditorToolbar } from "@/components/EditorToolbar";
import { EditorNavBar } from "@/components/EditorNavBar";
import { CommentSidebar } from "@/components/CommentThread";
import { VersionHistory } from "@/components/VersionHistory";
import type { Document, Comment, Snapshot, UserPresence } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import "./editor.css";

// Generate random user color
function getRandomColor() {
  const colors = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate random user name
function generateUsername() {
  const adjectives = ["Quick", "Clever", "Bright", "Swift", "Bold"];
  const nouns = ["Eagle", "Fox", "Lion", "Hawk", "Wolf"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const [showComments, setShowComments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  const { data: document } = useQuery<Document>({
    queryKey: ["/api/documents", id],
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/documents", id, "comments"],
    enabled: !!id,
  });

  const { data: snapshots = [] } = useQuery<Snapshot[]>({
    queryKey: ["/api/documents", id, "snapshots"],
    enabled: !!id,
  });

  const updateTitleMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("PATCH", `/api/documents/${id}`, { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id] });
    },
    onError: (error) => {
      console.error("Failed to update title:", error);
    },
    retry: 3,
    retryDelay: 1000,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const userName = localStorage.getItem("userName") || generateUsername();
      const userColor = localStorage.getItem("userColor") || getRandomColor();
      
      const res = await apiRequest("POST", `/api/documents/${id}/comments`, {
        content,
        authorName: userName,
        authorColor: userColor,
        position: 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id, "comments"] });
    },
    onError: (error) => {
      console.error("Failed to add comment:", error);
    },
    retry: 3,
    retryDelay: 1000,
  });

  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiRequest("PATCH", `/api/documents/${id}/comments/${commentId}`, { resolved: 1 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id, "comments"] });
    },
    onError: (error) => {
      console.error("Failed to resolve comment:", error);
    },
    retry: 2,
    retryDelay: 1000,
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiRequest("DELETE", `/api/documents/${id}/comments/${commentId}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id, "comments"] });
    },
    onError: (error) => {
      console.error("Failed to delete comment:", error);
    },
    retry: 2,
    retryDelay: 1000,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider || undefined,
        user: {
          name: localStorage.getItem("userName") || generateUsername(),
          color: localStorage.getItem("userColor") || getRandomColor(),
        },
      }),
      Placeholder.configure({
        placeholder: "Start typing your document...",
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-screen px-12 py-8",
      },
    },
  });

  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const userName = localStorage.getItem("userName") || generateUsername();
    const userColor = localStorage.getItem("userColor") || getRandomColor();
    
    localStorage.setItem("userName", userName);
    localStorage.setItem("userColor", userColor);
    
    const wsProvider = new WebsocketProvider(wsUrl, `document-${id}`, ydoc);
    
    wsProvider.on("status", (event: { status: string }) => {
      console.log("WebSocket status:", event.status);
    });

    wsProvider.on("sync", (isSynced: boolean) => {
      console.log("Sync status:", isSynced);
    });

    // Set local user info in awareness
    wsProvider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
    });

    // Listen for awareness changes
    const awarenessChangeHandler = () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const users: UserPresence[] = states
        .filter(([clientId]) => clientId !== wsProvider.awareness.clientID)
        .map(([clientId, state]: [number, any]) => ({
          id: clientId.toString(),
          name: state.user?.name || "Anonymous",
          color: state.user?.color || "#888",
          cursor: state.cursor,
        }));
      setActiveUsers(users);
    };

    wsProvider.awareness.on("change", awarenessChangeHandler);

    setProvider(wsProvider);

    return () => {
      wsProvider.awareness.off("change", awarenessChangeHandler);
      wsProvider.destroy();
    };
  }, [id, ydoc]);

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <EditorNavBar
        documentTitle={document.title}
        documentId={id!}
        onTitleChange={(title) => updateTitleMutation.mutate(title)}
        activeUsers={activeUsers}
        onToggleComments={() => {
          setShowComments(!showComments);
          setShowHistory(false);
        }}
        onToggleHistory={() => {
          setShowHistory(!showHistory);
          setShowComments(false);
        }}
        showComments={showComments}
        showHistory={showHistory}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorToolbar editor={editor} />
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="max-w-4xl mx-auto">
              <EditorContent editor={editor} data-testid="editor-content" />
            </div>
          </div>
        </div>

        {showComments && (
          <div className="w-80 flex-shrink-0">
            <CommentSidebar
              documentId={id!}
              comments={comments}
              onAddComment={(content) => addCommentMutation.mutate(content)}
              onResolveComment={(commentId) => resolveCommentMutation.mutate(commentId)}
              onDeleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
            />
          </div>
        )}

        {showHistory && (
          <div className="w-80 flex-shrink-0">
            <VersionHistory snapshots={snapshots} />
          </div>
        )}
      </div>
    </div>
  );
}
