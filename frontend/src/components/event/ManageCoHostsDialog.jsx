import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClubSearchPicker } from '@/components/event/ClubSearchPicker';
import { Clock, X } from 'lucide-react';

export function ManageCoHostsDialog({ open, onOpenChange, hosts, pendingInvites, submitting, onInvite, onCancelInvite, onRemove }) {
  const coHosts = (hosts || []).filter((h) => !h.isPrimary);
  const primary = (hosts || []).find((h) => h.isPrimary);

  const excludeIds = [
    ...(hosts || []).map((h) => h.clubId),
    ...(pendingInvites || []).map((i) => i.clubId),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage host clubs</DialogTitle>
          <DialogDescription>
            Invite other clubs to collaborate. The primary club cannot be removed. Any officer of a host club can invite or remove co-hosts.
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

          {pendingInvites.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Pending invitations ({pendingInvites.length})
              </p>
              <div className="space-y-1.5">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <Clock className="h-3.5 w-3.5 text-status-yellow" />
                      {inv.club?.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-muted-foreground hover:text-destructive"
                      disabled={submitting}
                      onClick={() => onCancelInvite(inv.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Invite a club</p>
            <ClubSearchPicker
              onSelect={onInvite}
              excludeIds={excludeIds}
              placeholder="Search clubs to invite..."
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
