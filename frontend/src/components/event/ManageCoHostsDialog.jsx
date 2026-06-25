import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

export function ManageCoHostsDialog({ open, onOpenChange, hosts, adminClubs, submitting, onAdd, onRemove }) {
  const coHosts = (hosts || []).filter((h) => !h.isPrimary);
  const primary = (hosts || []).find((h) => h.isPrimary);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage host clubs</DialogTitle>
          <DialogDescription>
            Primary club cannot be removed. Any officer of a host club can add or remove co-hosts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Primary</p>
            {primary ? (
              <Badge variant="default" className="text-xs">
                {primary.club?.name || 'Unknown'}
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground">No primary host</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Co-hosts {coHosts.length > 0 && `(${coHosts.length})`}
            </p>
            {coHosts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No co-hosts yet.</p>
            ) : (
              <div className="space-y-1.5">
                {coHosts.map((h) => (
                  <div key={h.clubId} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-medium">{h.club?.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive hover:text-destructive"
                      disabled={submitting}
                      onClick={() => onRemove(h.clubId)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {adminClubs.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Add a co-host
              </p>
              <div className="flex flex-wrap gap-2">
                {adminClubs.map((club) => (
                  <Button
                    key={club.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    onClick={() => onAdd(club.id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> {club.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
