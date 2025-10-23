import { Card } from "@/components/ui/card";
import { FileText, MoreVertical } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { Document } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const timeAgo = formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true });

  return (
    <Card 
      className="group relative hover-elevate overflow-hidden"
      data-testid={`card-document-${document.id}`}
    >
      <Link href={`/doc/${document.id}`}>
        <div className="p-6 cursor-pointer">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-base truncate" data-testid={`text-document-title-${document.id}`}>
                {document.title}
              </h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  data-testid={`button-document-menu-${document.id}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete?.(document.id);
                  }}
                  data-testid={`button-delete-document-${document.id}`}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm text-muted-foreground" data-testid={`text-document-updated-${document.id}`}>
            Edited {timeAgo}
          </p>
        </div>
      </Link>
    </Card>
  );
}
