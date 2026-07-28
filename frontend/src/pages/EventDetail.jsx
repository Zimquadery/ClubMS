import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, ImageIcon, Trash2, Pencil, Users, Plus } from 'lucide-react';
import BackLink from '@/components/BackLink';
import { formatDate, formatTime } from '@/lib/format';
import { DetailSkeleton } from '@/components/ui/skeleton';
import useEventDetail from '@/hooks/useEventDetail';
import { RsvpCard } from '@/components/event/RsvpCard';
import { EditEventDialog } from '@/components/event/EditEventDialog';
import { DeleteEventDialog } from '@/components/event/DeleteEventDialog';
import { ManageCoHostsDialog } from '@/components/event/ManageCoHostsDialog';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const vm = useEventDetail(id, user);

  if (vm.loading) {
    return <DetailSkeleton />;
  }

  if (vm.error) {
    return (
      <div className="space-y-4">
        <BackLink to="/events" label="Back to Events" />
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{vm.error}</div>
      </div>
    );
  }

  if (!vm.event) return null;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <BackLink to="/events" label="Back to Events" />

      {vm.event.bannerUrl && (
        <div className="relative img-outline mt-4 w-full h-48 sm:h-64 rounded-xl overflow-hidden">
          <img src={vm.event.bannerUrl} alt={vm.event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className={vm.event.bannerUrl ? 'mt-6' : 'mt-4'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{vm.event.title}</h1>
              {vm.isPast && <Badge variant="secondary">Past</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              {vm.event.club && (
                <Link to={`/clubs/${vm.event.club?.id}`} className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
                  {vm.event.club?.logoUrl ? (
                    <img src={vm.event.club.logoUrl} alt="" className="h-5 w-5 rounded object-cover" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {vm.event.club?.name}
                </Link>
              )}
              {vm.coHosts.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">+</span>
                  {vm.coHosts.map((h) => (
                    <Link key={h.clubId} to={`/clubs/${h.clubId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-primary hover:underline">
                      {h.club?.logoUrl ? (
                        <img src={h.club.logoUrl} alt="" className="h-4 w-4 rounded object-cover" />
                      ) : (
                        <ImageIcon className="h-3 w-3" />
                      )}
                      {h.club?.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
          {vm.canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={vm.openEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              {vm.canDelete && (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => vm.setDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(vm.event.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatTime(vm.event.startTime)} – {formatTime(vm.event.endTime)}
          </span>
          {vm.event.venue && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {vm.event.venue}
            </span>
          )}
        </div>

        {vm.event.description && (
          <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">
            {vm.event.description}
          </div>
        )}
      </div>

      {vm.canManage && (
        <div className="mt-6 rounded-md border border-input p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-primary" />
              <span className="text-sm font-medium">Hosting clubs</span>
              <Badge variant="outline" className="text-xs">{vm.event.hosts?.length || 1}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => vm.setCoHostDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Manage
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {vm.event.hosts?.map((h) => (
              <Badge key={h.clubId} variant={h.isPrimary ? 'default' : 'secondary'} className="text-xs">
                {h.club?.name}{h.isPrimary ? ' (primary)' : ''}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <RsvpCard
        id={id}
        userRsvp={vm.userRsvp}
        rsvpLoading={vm.rsvpLoading}
        attendeeCount={vm.attendeeCount}
        canManage={vm.canManage}
        isPast={vm.isPast}
        canRsvp={vm.canRsvp}
        onRsvp={vm.handleRsvp}
        onRemoveRsvp={vm.handleRemoveRsvp}
        onExport={vm.handleExportRsvps}
        userMembership={vm.event.userMembership}
        clubId={vm.event.club?.id}
        clubName={vm.event.club?.name}
        hostsCount={vm.event.hosts?.length}
      />

      <EditEventDialog
        open={vm.editDialog}
        onOpenChange={vm.setEditDialog}
        form={vm.form}
        setForm={vm.setForm}
        submitting={vm.submitting}
        onSubmit={vm.handleEdit}
      />

      <DeleteEventDialog
        open={vm.deleteDialog}
        onOpenChange={vm.setDeleteDialog}
        eventTitle={vm.event.title}
        submitting={vm.submitting}
        onDelete={vm.handleDelete}
      />

      <ManageCoHostsDialog
        open={vm.coHostDialog}
        onOpenChange={vm.setCoHostDialog}
        hosts={vm.event.hosts || []}
        adminClubs={vm.adminClubs}
        submitting={vm.coHostSubmitting}
        onAdd={vm.handleAddCoHost}
        onRemove={vm.handleRemoveCoHost}
      />
    </div>
  );
}
