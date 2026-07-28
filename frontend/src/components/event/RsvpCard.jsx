import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Users, Download } from 'lucide-react';

export function RsvpCard({ id, userRsvp, rsvpLoading, attendeeCount, canManage, isPast, canRsvp, onRsvp, onRemoveRsvp, onExport, userMembership, clubId, clubName, hostsCount }) {
  if (!isPast) {
    if (canRsvp) {
      return (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-between flex-wrap gap-3 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={userRsvp?.status === 'GOING' ? 'default' : 'outline'}
                className={userRsvp?.status === 'GOING' ? 'bg-status-green hover:bg-status-green/90 text-white' : ''}
                onClick={() => onRsvp('GOING')}
                disabled={rsvpLoading}
              >
                Going
              </Button>
              <Button
                size="sm"
                variant={userRsvp?.status === 'MAYBE' ? 'default' : 'outline'}
                className={userRsvp?.status === 'MAYBE' ? 'bg-status-yellow hover:bg-status-yellow/90 text-white' : ''}
                onClick={() => onRsvp('MAYBE')}
                disabled={rsvpLoading}
              >
                Maybe
              </Button>
              <Button
                size="sm"
                variant={userRsvp?.status === 'NOT_GOING' ? 'default' : 'outline'}
                className={userRsvp?.status === 'NOT_GOING' ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
                onClick={() => onRsvp('NOT_GOING')}
                disabled={rsvpLoading}
              >
                Not Going
              </Button>
              {userRsvp && (
                <Button size="sm" variant="ghost" onClick={onRemoveRsvp} disabled={rsvpLoading}>
                  Clear RSVP
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {canManage && attendeeCount > 0 && (
                <span className="text-sm text-muted-foreground tabular-nums">{attendeeCount} attending</span>
              )}
              {canManage && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/events/${id}/rsvps`}>
                      <Users className="h-4 w-4 mr-1" /> RSVPs
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={onExport}>
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        {userMembership
          ? 'Only active members can RSVP'
          : (hostsCount && hostsCount > 1)
            ? 'Join a host club to RSVP'
            : <>Join <Link to={`/clubs/${clubId}`} className="text-brand-primary hover:underline">{clubName || 'this club'}</Link> to RSVP</>
        }
      </p>
    );
  }

  if (canManage && attendeeCount > 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground tabular-nums">
        {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
      </p>
    );
  }

  return null;
}
