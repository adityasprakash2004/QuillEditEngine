import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "./UserAvatar";
import { Check, MessageCircle, X } from "lucide-react";
import type { Comment } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface CommentThreadProps {
  comment: Comment;
  onResolve?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CommentThread({ comment, onResolve, onDelete }: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(!comment.resolved);
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });

  return (
    <div 
      className={`p-4 rounded-md border ${comment.resolved ? "bg-muted/50" : "bg-card"}`}
      data-testid={`comment-${comment.id}`}
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={comment.authorName} color={comment.authorColor} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{comment.authorName}</span>
              {comment.resolved === 1 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Resolved
                </span>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-toggle-comment-${comment.id}`}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
          
          {isExpanded && (
            <>
              <p className="text-sm mb-2 whitespace-pre-wrap" data-testid={`text-comment-content-${comment.id}`}>
                {comment.content}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
                {comment.resolved === 0 && onResolve && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onResolve(comment.id)}
                    data-testid={`button-resolve-comment-${comment.id}`}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Resolve
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive"
                    onClick={() => onDelete(comment.id)}
                    data-testid={`button-delete-comment-${comment.id}`}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentSidebarProps {
  documentId: string;
  comments: Comment[];
  onAddComment?: (content: string) => void;
  onResolveComment?: (id: string) => void;
  onDeleteComment?: (id: string) => void;
}

export function CommentSidebar({
  comments,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}: CommentSidebarProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment);
      setNewComment("");
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-l" data-testid="sidebar-comments">
      <div className="p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No comments yet</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onResolve={onResolveComment}
              onDelete={onDeleteComment}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="mb-2 resize-none"
          rows={3}
          data-testid="input-new-comment"
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="w-full"
          data-testid="button-add-comment"
        >
          Add Comment
        </Button>
      </div>
    </div>
  );
}
