import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Users, Calendar, MapPin, ImageIcon, Clock, Trash2 } from 'lucide-react'
import BackLink from '@/components/BackLink'
import ClubAnnouncements from '@/components/ClubAnnouncements'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import { formatDate, formatTime } from '@/lib/format'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/Pagination'
import useClubDetail from '@/hooks/useClubDetail'
import MembershipAction from '@/components/club/MembershipAction'

export default function ClubDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const vm = useClubDetail(id, user)

  if (vm.loading) {
    return (
      <div className="space-y-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (vm.error) {
    return (
      <div className="space-y-4">
        <BackLink to="/clubs" label="Back to Directory" />
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{vm.error}</div>
      </div>
    )
  }

  if (!vm.club) return null

  return (
    <div>
      <BackLink to="/clubs" label="Back to Directory" />

      <div className="mt-6 flex flex-col sm:flex-row gap-5 items-start">
        <div className="flex-shrink-0 h-20 w-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
          {vm.club.logoUrl ? (
            <img src={vm.club.logoUrl} alt={vm.club.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-9 w-9 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{vm.club.name}</h1>
            <Badge variant="secondary">{vm.club.category}</Badge>
          </div>
          {vm.club.description && (
            <p className="text-sm text-muted-foreground mt-2">{vm.club.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {vm.memberCount} active member{vm.memberCount !== 1 ? 's' : ''}
            </span>
            <MembershipAction
              userMembership={vm.userMembership}
              user={user}
              joinLoading={vm.joinLoading}
              leaveLoading={vm.leaveLoading}
              onJoin={vm.handleJoin}
              onLeave={vm.handleLeave}
              clubId={id}
            />
          </div>
        </div>
      </div>

      {(vm.userMembership?.status === 'ACTIVE' || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY') && (
        <ClubAnnouncements clubId={vm.club.id} userMembership={vm.userMembership} user={user} />
      )}

      <div className={`grid gap-4 mt-8 ${vm.canViewMembers ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-brand-primary" />
                Upcoming Events
              </CardTitle>
              {vm.canManageEvents && (
                <Dialog open={vm.showCreateDialog} onOpenChange={vm.setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                      Create Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Event</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={vm.handleCreateEvent} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="event-title">Title</Label>
                        <Input id="event-title" required value={vm.newEvent.title} onChange={(e) => vm.setNewEvent({ ...vm.newEvent, title: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-description">Description</Label>
                        <Textarea id="event-description" value={vm.newEvent.description} onChange={(e) => vm.setNewEvent({ ...vm.newEvent, description: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-start">Start Time</Label>
                        <Input id="event-start" type="datetime-local" required value={vm.newEvent.startTime} onChange={(e) => vm.setNewEvent({ ...vm.newEvent, startTime: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-end">End Time</Label>
                        <Input id="event-end" type="datetime-local" required value={vm.newEvent.endTime} onChange={(e) => vm.setNewEvent({ ...vm.newEvent, endTime: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-location">Location</Label>
                        <Input id="event-location" value={vm.newEvent.location} onChange={(e) => vm.setNewEvent({ ...vm.newEvent, location: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-banner">Banner</Label>
                        <div className="flex gap-2">
                          <Input id="event-banner" value={vm.newEvent.bannerUrl} onChange={(e) => vm.setNewEvent({ ...vm.newEvent, bannerUrl: e.target.value })} className="flex-1" />
                          <ImageUploadButton onUploadComplete={(url) => vm.setNewEvent({ ...vm.newEvent, bannerUrl: url })} />
                        </div>
                      </div>
                      {vm.adminClubs.length > 0 && (
                        <div className="space-y-2">
                          <Label>Co-host clubs (optional)</Label>
                          <p className="text-xs text-muted-foreground">Invite other clubs you officer to collaborate on this event.</p>
                          <div className="flex flex-wrap gap-2">
                            {vm.adminClubs.map((club) => {
                              const selected = vm.newEvent.coHostClubIds.includes(club.id)
                              return (
                                <button
                                  type="button"
                                  key={club.id}
                                  onClick={() => vm.toggleCoHost(club.id)}
                                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selected ? 'bg-brand-primary text-white border-brand-primary' : 'bg-background hover:bg-accent'}`}
                                >
                                  {club.name}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => vm.setShowCreateDialog(false)} disabled={vm.submitting}>Cancel</Button>
                        <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={vm.submitting}>{vm.submitting ? 'Creating...' : 'Create'}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {vm.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            ) : (
              <>
                <div className="divide-y">
                  {vm.events.map((event) => (
                    <div key={event.id} className="space-y-1 py-2 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/events/${event.id}`} className="font-medium text-sm hover:underline">{event.title}</Link>
                        {vm.canManageEvents && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive" aria-label="Delete event" onClick={() => vm.setDeleteEventTarget(event)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(event.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.startTime)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  ))}
                </div>
                <Pagination
                  page={vm.eventsPage}
                  totalPages={vm.eventsTotalPages}
                  onPageChange={vm.setEventsPage}
                />
              </>
            )}
          </CardContent>
        </Card>

        {vm.canViewMembers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-brand-primary" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vm.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active members yet.</p>
              ) : (
                <>
                  <div className="divide-y">
                    {vm.members.map((membership) => (
                      <div key={membership.id} className="flex items-center justify-between text-sm py-2 first:pt-0 last:pb-0">
                        <span className="font-medium">{membership.user.name}</span>
                        {membership.role === 'OFFICER' && (
                          <Badge variant="outline" className="text-xs">Officer</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={vm.membersPage}
                    totalPages={vm.membersTotalPages}
                    onPageChange={vm.setMembersPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={!!vm.deleteEventTarget} onOpenChange={(open) => !open && vm.setDeleteEventTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{vm.deleteEventTarget?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => vm.setDeleteEventTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={vm.handleDeleteEvent}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
