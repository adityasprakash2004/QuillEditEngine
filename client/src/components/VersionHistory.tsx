import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, RotateCcw } from "lucide-react";
import type { Snapshot } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface VersionHistoryProps {
  snapshots: Snapshot[];
  onRestore?: (snapshotId: string) => void;
}

export function VersionHistory({ snapshots, onRestore }: VersionHistoryProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l" data-testid="sidebar-history">
      <div className="p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Version History
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {snapshots.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No snapshots yet</p>
            </div>
          ) : (
            snapshots.map((snapshot, index) => {
              const timeAgo = formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true });
              const isLatest = index === 0;

              return (
                <div
                  key={snapshot.id}
                  className="p-3 rounded-md border hover-elevate"
                  data-testid={`snapshot-${snapshot.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-medium">
                        {isLatest ? "Current Version" : `Snapshot ${snapshots.length - index}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo}</p>
                    </div>
                    {!isLatest && onRestore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => onRestore(snapshot.id)}
                        data-testid={`button-restore-${snapshot.id}`}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
