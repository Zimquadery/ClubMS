import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import client from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Clock, ImageIcon, Trash2, Pencil, Download, Users } from 'lucide-react'
import BackLink from '@/components/BackLink'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import { formatDate, formatTime } from '@/lib/format'
import { toast } from 'sonner'
import { downloadBlob } from '@/lib/download'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DetailSkeleton } from '@/components/ui/skeleton'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editDialog, setEditDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', location: '', bannerUrl: '' })
  const [userRsvp, setUserRsvp] = useState(null)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState(0)

  useEffect(() => {
    fetchEvent()
  }, [id])

  async function fetchEvent() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get(`/events/${id}`)
      setEvent(res.data)
      try {
        const [rsvpRes, countRes] = await Promise.all([
          client.get(`/events/${id}/rsvp`),
          client.get(`/events/${id}/rsvps`, { params: { limit: 1 } }),
        ])
        setUserRsvp(rsvpRes.data)
        setAttendeeCount(countRes.data.total)
      } catch {}
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  async function handleRsvp(status) {
    setRsvpLoading(true)
    try {
      const res = await client.post(`/events/${id}/rsvp`, { status })
      setUserRsvp(res.data)
      if (status === 'NOT_GOING') {
        setAttendeeCount(prev => Math.max(0, prev - 1))
      } else if (!userRsvp || userRsvp.status === 'NOT_GOING') {
        setAttendeeCount(prev => prev + 1)
      }
      toast.success(`You're ${status === 'GOING' ? 'going' : status === 'MAYBE' ? 'maybe attending' : 'not going'}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update RSVP')
    } finally {
      setRsvpLoading(false)
    }
  }

  async function handleRemoveRsvp() {
    setRsvpLoading(true)
    try {
      await client.delete(`/events/${id}/rsvp`)
      if (userRsvp?.status !== 'NOT_GOING') {
        setAttendeeCount(prev => Math.max(0, prev - 1))
      }
      setUserRsvp(null)
      toast.success('RSVP removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove RSVP')
    } finally {
      setRsvpLoading(false)
    }
  }

  async function handleExportRsvps() {
    try {
      const res = await client.get(`/events/${id}/rsvps/export`, { responseType: 'blob' })
      downloadBlob(res.data, `rsvps-${id}.csv`)
      toast.success('RSVPs exported')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export RSVPs')
    }
  }

  function openEdit() {
    if (!event) return
    const toLocal = (iso) => {
      const d = new Date(iso)
      const offset = d.getTimezoneOffset()
      const local = new Date(d.getTime() - offset * 60000)
      return local.toISOString().slice(0, 16)
    }
    setForm({
      title: event.title,
      description: event.description || '',
      startTime: toLocal(event.startTime),
      endTime: toLocal(event.endTime),
      location: event.location || '',
      bannerUrl: event.bannerUrl || '',
    })
    setEditDialog(true)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSubmitting(true)
    if (form.startTime && form.endTime) {
      const start = new Date(form.startTime)
      const end = new Date(form.endTime)
      if (end <= start) {
        toast.error('End time must be after start time')
        setSubmitting(false)
        return
      }
    }
    try {
      await client.patch(`/events/${id}`, form)
      setEditDialog(false)
      toast.success('Event updated')
      await fetchEvent()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update event')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setSubmitting(true)
    try {
      await client.delete(`/events/${id}`)
      toast.success('Event deleted')
      setDeleteDialog(false)
      navigate(-1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event')
    } finally {
      setSubmitting(false)
    }
  }

  const canManage = (event?.userMembership?.role === 'OFFICER' && event?.userMembership?.status === 'ACTIVE') || user?.role === 'PLATFORM_ADMIN'
  const isPast = event ? new Date(event.startTime) < new Date() : false

  if (loading) {
    return <DetailSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink to="/events" label="Back to Events" />
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  if (!event) return null

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink to="/events" label="Back to Events" />

      {event.bannerUrl && (
        <div className="mt-4 w-full h-48 sm:h-64 rounded-xl overflow-hidden">
          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className={event.bannerUrl ? 'mt-6' : 'mt-4'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{event.title}</h1>
              {isPast && <Badge variant="secondary">Past</Badge>}
            </div>
            <Link to={`/clubs/${event.club?.id}`} className="inline-flex items-center gap-2 mt-1.5 text-sm text-brand-primary hover:underline">
              {event.club?.logoUrl ? (
                <img src={event.club.logoUrl} alt="" className="h-5 w-5 rounded object-cover" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {event.club?.name}
            </Link>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteDialog(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(event.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}
        </div>

        {event.description && (
          <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">
            {event.description}
          </div>
        )}
      </div>

      {!isPast && (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-between flex-wrap gap-3 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={userRsvp?.status === 'GOING' ? 'default' : 'outline'}
                className={userRsvp?.status === 'GOING' ? 'bg-status-green hover:bg-status-green/90 text-white' : ''}
                onClick={() => handleRsvp('GOING')}
                disabled={rsvpLoading}
              >
                Going
              </Button>
              <Button
                size="sm"
                variant={userRsvp?.status === 'MAYBE' ? 'default' : 'outline'}
                className={userRsvp?.status === 'MAYBE' ? 'bg-status-yellow hover:bg-status-yellow/90 text-white' : ''}
                onClick={() => handleRsvp('MAYBE')}
                disabled={rsvpLoading}
              >
                Maybe
              </Button>
              <Button
                size="sm"
                variant={userRsvp?.status === 'NOT_GOING' ? 'default' : 'outline'}
                className={userRsvp?.status === 'NOT_GOING' ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
                onClick={() => handleRsvp('NOT_GOING')}
                disabled={rsvpLoading}
              >
                Not Going
              </Button>
              {userRsvp && (
                <Button size="sm" variant="ghost" onClick={handleRemoveRsvp} disabled={rsvpLoading}>
                  Clear RSVP
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {attendeeCount > 0 && (
                <span className="text-sm text-muted-foreground">{attendeeCount} attending</span>
              )}
              {canManage && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/events/${id}/rsvps`}>
                      <Users className="h-4 w-4 mr-1" /> RSVPs
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportRsvps}>
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isPast && attendeeCount > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
        </p>
      )}

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ed-title">Title</Label>
              <Input id="ed-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-desc">Description</Label>
              <Textarea id="ed-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ed-start">Start Time</Label>
                <Input id="ed-start" type="datetime-local" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-end">End Time</Label>
                <Input id="ed-end" type="datetime-local" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-loc">Location</Label>
              <Input id="ed-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-banner">Banner</Label>
              <div className="flex gap-2">
                <Input id="ed-banner" value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} className="flex-1" />
                <ImageUploadButton onUploadComplete={(url) => setForm({ ...form, bannerUrl: url })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{event.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
