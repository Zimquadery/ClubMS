import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import { useCohostInvites } from '@/hooks/useCohostInvites';
import { CoHostInvitesList } from '@/components/event/CoHostInvitesList';
import { SkeletonReveal } from '@/components/ui/SkeletonReveal';
import { ListSkeleton } from '@/components/ui/skeleton';

export function ClubCoHostInvitesCard({ clubId }) {
  const { invites, loading, acting, accept, reject } = useCohostInvites(clubId);

  if (!loading && invites.length === 0) return null;

  return (
    <Card className="border-status-yellow/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-status-yellow" />
          Co-host invitations
          {invites.length > 0 && (
            <Badge variant="outline" className="text-xs text-status-yellow border-status-yellow">{invites.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SkeletonReveal isLoading={loading} skeleton={<ListSkeleton rows={1} />}>
          <CoHostInvitesList invites={invites} acting={acting} onAccept={accept} onReject={reject} />
        </SkeletonReveal>
      </CardContent>
    </Card>
  );
}
