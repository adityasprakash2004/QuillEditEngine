import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatar } from "./UserAvatar";
import { Share2, MessageCircle, Clock, Home } from "lucide-react";
import { Link } from "wouter";
import type { UserPresence } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface EditorNavBarProps {
  documentTitle: string;
  documentId: string;
  onTitleChange: (title: string) => void;
  activeUsers: UserPresence[];
  onToggleComments: () => void;
  onToggleHistory: () => void;
  showComments: boolean;
  showHistory: boolean;
}

export function EditorNavBar({
  documentTitle,
  documentId,
  onTitleChange,
  activeUsers,
  onToggleComments,
  onToggleHistory,
  showComments,
  showHistory,
}: EditorNavBarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(documentTitle);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();

  const handleTitleSubmit = () => {
    onTitleChange(title);
    setIsEditingTitle(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/doc/${documentId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Anyone with this link can view and edit this document.",
    });
    setShowShareDialog(false);
  };

  return (
    <>
      <nav className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-home">
              <Home className="w-5 h-5" />
            </Button>
          </Link>

          {isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setTitle(documentTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="max-w-md"
              data-testid="input-document-title"
            />
          ) : (
            <h1
              className="text-lg font-semibold truncate cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => setIsEditingTitle(true)}
              data-testid="text-document-title"
            >
              {documentTitle}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleComments}
            className={showComments ? "bg-accent" : ""}
            data-testid="button-toggle-comments"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleHistory}
            className={showHistory ? "bg-accent" : ""}
            data-testid="button-toggle-history"
          >
            <Clock className="w-5 h-5" />
          </Button>

          <Button
            variant="default"
            onClick={() => setShowShareDialog(true)}
            className="gap-2"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>

          {activeUsers.length > 0 && (
            <div className="flex items-center -space-x-2 pl-2">
              {activeUsers.slice(0, 5).map((user) => (
                <UserAvatar
                  key={user.id}
                  name={user.name}
                  color={user.color}
                  size="sm"
                  className="ring-2 ring-card"
                />
              ))}
              {activeUsers.length > 5 && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-card">
                  +{activeUsers.length - 5}
                </div>
              )}
            </div>
          )}

          <ThemeToggle />
        </div>
      </nav>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Anyone with this link can view and edit this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={`${window.location.origin}/doc/${documentId}`}
                readOnly
                data-testid="input-share-url"
              />
              <Button onClick={handleShare} data-testid="button-copy-link">
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
