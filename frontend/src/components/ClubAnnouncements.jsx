import { useState, useEffect } from 'react'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Megaphone, Pin, PinOff, Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ListSkeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/Pagination'

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ClubAnnouncements({ clubId, userMembership, user }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const isOfficer = (userMembership?.role === 'OFFICER' && userMembership?.status === 'ACTIVE') || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY'

  useEffect(() => {
    let active = true
    setLoading(true)
    async function doFetch() {
      try {
        const res = await client.get(`/clubs/${clubId}/announcements`, { params: { page, limit: 5 } })
        const items = res.data.items || res.data
        if (!active) return
        if (items.length === 0 && page > 1) {
          setPage(page - 1)
          return
        }
        setAnnouncements(items)
        setTotalPages(res.data.totalPages || 1)
      } catch {
        if (active) toast.error('Failed to load announcements')
      } finally {
        if (active) setLoading(false)
      }
    }
    doFetch()
    return () => { active = false }
  }, [clubId, refreshKey, page])

  function refresh() {
    setRefreshKey((k) => k + 1)
  }

  function openCreate() {
    setForm({ title: '', content: '' })
    setShowCreateDialog(true)
  }

  function openEdit(ann) {
    setForm({ title: ann.title, content: ann.content })
    setEditTarget(ann)
    setShowEditDialog(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await client.post(`/clubs/${clubId}/announcements`, form)
      setShowCreateDialog(false)
      toast.success('Announcement posted')
      setPage(1)
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create announcement')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!editTarget) return
    setSubmitting(true)
    try {
      await client.patch(`/clubs/${clubId}/announcements/${editTarget.id}`, form)
      setShowEditDialog(false)
      setEditTarget(null)
      toast.success('Announcement updated')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update announcement')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await client.delete(`/clubs/${clubId}/announcements/${deleteTarget.id}`)
      setDeleteTarget(null)
      toast.success('Announcement deleted')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete announcement')
    }
  }

  async function handleTogglePin(ann) {
    try {
      await client.patch(`/clubs/${clubId}/announcements/${ann.id}/pin`)
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle pin')
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-brand-primary" />
            Announcements
          </CardTitle>
          {isOfficer && (
            <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/90 text-white" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Post
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="divide-y">
            {announcements.map((ann) => (
              <div key={ann.id} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{ann.title}</span>
                    {ann.pinned && (
                      <Badge className="bg-brand-primary/10 text-brand-primary border-transparent text-xs">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                  </div>
                  {isOfficer && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label={ann.pinned ? 'Unpin' : 'Pin'} onClick={() => handleTogglePin(ann)}>
                        {ann.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label="Edit" onClick={() => openEdit(ann)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Delete" onClick={() => setDeleteTarget(ann)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ann.author ? ann.author.name : 'Former Officer'} · {timeAgo(ann.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </CardContent>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input id="ann-title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-content">Content</Label>
              <Textarea id="ann-content" required maxLength={2000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={submitting}>{submitting ? 'Posting...' : 'Post'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ann-title">Title</Label>
              <Input id="edit-ann-title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ann-content">Content</Label>
              <Textarea id="edit-ann-content" required maxLength={2000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowEditDialog(false); setEditTarget(null) }} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
