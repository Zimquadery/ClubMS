import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Users, Calendar, MapPin, ImageIcon, Clock, Trash2, X, Search, ScrollText, Pencil, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import BackLink from '@/components/BackLink'
import ClubAnnouncements from '@/components/ClubAnnouncements'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import { VenuePicker } from '@/components/event/VenuePicker'
import { ClubSearchPicker } from '@/components/event/ClubSearchPicker'
import { ClubCoHostInvitesCard } from '@/components/event/ClubCoHostInvitesCard'
import { TagInput } from '@/components/event/TagInput'
import { formatDate, formatTime } from '@/lib/format'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/Pagination'
import useClubDetail from '@/hooks/useClubDetail'
import MembershipAction from '@/components/club/MembershipAction'
import MemberDetailDialog from '@/components/club/MemberDetailDialog'
import { EditClubProfileDialog } from '@/components/club/EditClubProfileDialog'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

export default function ClubDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const vm = useClubDetail(id, user)
  const [memberTarget, setMemberTarget] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)

  if (vm.loading) {
    return (
      <div className="space-y-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (vm.error && !vm.club) {
    return (
      <div className="space-y-4">
        <BackLink to="/clubs" label="Back to Directory" />
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{vm.error}</div>
      </div>
    )
  }

  if (!vm.club) return null

  return (
    <div className="animate-fade-in">
      <BackLink to="/clubs" label="Back to Directory" />

      <div className="mt-6 flex flex-col sm:flex-row gap-5 items-start">
        <div className="relative img-outline flex-shrink-0 h-20 w-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
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
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{vm.club.description}</p>
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
              joinBlocked={vm.joinBlocked}
              joinBlockedNote={vm.joinBlockedNote}
              rules={vm.club.rules}
            />
            {vm.canManageEvents && (
              <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Club
              </Button>
            )}
          </div>
        </div>
      </div>

      {vm.club.rules && (
        <Collapsible open={rulesOpen} onOpenChange={setRulesOpen} className="mt-6">
          <Card>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-xl p-6 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ScrollText className="h-5 w-5 text-brand-primary" />
                  Club Rules
                </CardTitle>
                <ChevronRight
                  aria-hidden="true"
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out-quart', rulesOpen && 'rotate-90')}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="t-collapsible-content">
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{vm.club.rules}</p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {(vm.userMembership?.status === 'ACTIVE' || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY') && (
        <ClubAnnouncements clubId={vm.club.id} userMembership={vm.userMembership} user={user} />
      )}

      {vm.canManageEvents && (
        <div className="mt-6">
          <ClubCoHostInvitesCard clubId={vm.club.id} />
        </div>
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
                      <VenuePicker
                        idPrefix="event"
                        venueId={vm.newEvent.venueId}
                        venue={vm.newEvent.venue}
                        onChange={({ venueId, venue }) => vm.setNewEvent({ ...vm.newEvent, venueId, venue })}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="event-banner">Banner</Label>
                        <div className="flex gap-2">
                          <Input id="event-banner" value={vm.newEvent.bannerUrl} onChange={(e) => vm.setNewEvent({ ...vm.newEvent, bannerUrl: e.target.value })} className="flex-1" />
                          <ImageUploadButton onUploadComplete={(url) => vm.setNewEvent({ ...vm.newEvent, bannerUrl: url })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Invite co-host clubs (optional)</Label>
                        <p className="text-xs text-muted-foreground">Invite other clubs to collaborate. Their officers must accept before co-hosting.</p>
                        <ClubSearchPicker
                          onSelect={vm.addInvitee}
                          excludeIds={[vm.club?.id, ...vm.newEvent.invitedClubs.map((c) => c.id)]}
                        />
                        {vm.newEvent.invitedClubs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {vm.newEvent.invitedClubs.map((club) => (
                              <button
                                type="button"
                                key={club.id}
                                onClick={() => vm.removeInvitee(club.id)}
                                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border bg-brand-primary text-white border-brand-primary transition active:scale-[0.96]"
                              >
                                {club.name}
                                <X className="h-3 w-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <TagInput
                        idPrefix="event"
                        value={vm.newEvent.tags}
                        onChange={(tags) => vm.setNewEvent({ ...vm.newEvent, tags })}
                      />
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
            <div className={vm.refreshing ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'} aria-busy={vm.refreshing}>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive" aria-label="Delete event" onClick={() => vm.setDeleteEventTarget(event)}>
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
                        {event.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
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
              </div>
          </CardContent>
        </Card>

        {vm.canViewMembers && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-brand-primary" />
                  {vm.membersStatus === 'ALUMNI' ? 'Alumni' : 'Members'}
                </CardTitle>
                <div role="tablist" aria-label="Member type" className="flex gap-2">
                  <Button
                    role="tab"
                    aria-selected={vm.membersStatus === 'ACTIVE'}
                    size="sm"
                    variant={vm.membersStatus === 'ACTIVE' ? 'default' : 'outline'}
                    className={vm.membersStatus === 'ACTIVE' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
                    onClick={() => { vm.setMembersStatus('ACTIVE'); vm.setMembersPage(1) }}
                  >
                    Members
                  </Button>
                  <Button
                    role="tab"
                    aria-selected={vm.membersStatus === 'ALUMNI'}
                    size="sm"
                    variant={vm.membersStatus === 'ALUMNI' ? 'default' : 'outline'}
                    className={vm.membersStatus === 'ALUMNI' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
                    onClick={() => { vm.setMembersStatus('ALUMNI'); vm.setMembersPage(1) }}
                  >
                    Alumni
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or department"
                  aria-label="Search members by name or department"
                  value={vm.membersSearch}
                  onChange={(e) => vm.setMembersSearch(e.target.value)}
                  maxLength={25}
                  className="pl-8 w-48"
                />
              </div>
              <div className={vm.refreshing ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'} aria-busy={vm.refreshing}>
              {vm.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {vm.membersStatus === 'ALUMNI'
                    ? (vm.membersSearch ? 'No alumni found' : 'No alumni yet.')
                    : (vm.membersSearch ? 'No members found' : 'No active members yet.')}
                </p>
              ) : (
                <>
                  <div className="divide-y">
                    {vm.members.map((membership) => (
                      <button
                        key={membership.id}
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`View ${membership.user.name}'s info`}
                        onClick={() => setMemberTarget(membership)}
                        className="-mx-2 flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors first:pt-0 last:pb-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">{membership.user.name}</span>
                          {membership.user.department && (
                            <span className="whitespace-nowrap text-xs text-muted-foreground">{membership.user.department}</span>
                          )}
                          {membership.position && (
                            <span className="whitespace-nowrap text-xs font-medium text-brand-primary">{membership.position}</span>
                          )}
                        </span>
                        {membership.role === 'OFFICER' && (
                          <Badge variant="outline" className="text-xs">Officer</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                  <Pagination
                    page={vm.membersPage}
                    totalPages={vm.membersTotalPages}
                    onPageChange={vm.setMembersPage}
                  />
                </>
              )}
              </div>
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
      <MemberDetailDialog member={memberTarget} onOpenChange={() => setMemberTarget(null)} />
      <EditClubProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        club={vm.club}
        onSaved={() => vm.fetchClub()}
      />

    </div>
  )
}
