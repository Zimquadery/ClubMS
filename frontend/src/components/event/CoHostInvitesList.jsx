import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export function CoHostInvitesList({ invites, acting, onAccept, onReject }) {
  if (!invites || invites.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending co-host invitations.</p>;
  }
  return (
    <div className="divide-y">
      {invites.map((inv) => (
        <div key={inv.id} className="py-2 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/events/${inv.event.id}`} className="text-sm font-medium hover:underline">
                {inv.event.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invited by {inv.invitedByClub?.name || 'a host club'}
                {inv.event.startTime && ` · ${formatDate(inv.event.startTime)}`}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="sm"
                className="h-7 bg-status-green hover:bg-status-green/90 text-white"
                disabled={acting}
                onClick={() => onAccept(inv.id)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                disabled={acting}
                onClick={() => onReject(inv.id)}
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
