import { useState } from 'react'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MapPin, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { ListSkeleton } from '@/components/ui/skeleton'
import { SkeletonReveal } from '@/components/ui/SkeletonReveal'
import { Pagination } from '@/components/Pagination'
import usePaginatedFetch from '@/hooks/usePaginatedFetch'

const EMPTY = { name: '' }

export default function Venues() {
  const {
    items: venues, loading, error, page, totalPages, total,
    refetch: fetchVenues,
    setURLParam,
  } = usePaginatedFetch({
    fetchFn: async ({ page }) => {
      const res = await client.get('/venues', { params: { page, limit: 20 } })
      return {
        items: res.data.items ? res.data.items : res.data,
        totalPages: res.data.totalPages || 1,
        total: res.data.total || 0,
      }
    },
    deps: [],
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY)
  const [editError, setEditError] = useState('')
  const [editing, setEditing] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }
    setSubmitting(true)
    try {
      await client.post('/venues', { name: form.name.trim() })
      setDialogOpen(false)
      toast.success('Venue created')
      setForm(EMPTY)
      await fetchVenues()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create venue')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await client.delete(`/venues/${id}`)
      setDeleteTarget(null)
      toast.success('Venue deleted')
      await fetchVenues()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete venue')
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(venue) {
    setEditTarget(venue)
    setEditForm({ name: venue.name })
    setEditError('')
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditError('')
    if (!editForm.name.trim()) {
      setEditError('Name is required')
      return
    }
    setEditing(true)
    try {
      await client.patch(`/venues/${editTarget.id}`, { name: editForm.name.trim() })
      setEditTarget(null)
      toast.success('Venue updated')
      await fetchVenues()
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update venue')
    } finally {
      setEditing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Venues</h1>
          {!loading && venues.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {total} venue{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Venue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Venue</DialogTitle>
              <DialogDescription>Venues appear in the event dropdown. Officers can also enter custom locations.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-2 py-4">
                {formError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>
                )}
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                  placeholder="e.g. Auditorium"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Venue'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {!loading && venues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No venues yet. Create your first venue using the button above.
          </CardContent>
        </Card>
      ) : (
        <SkeletonReveal isLoading={loading} skeleton={<ListSkeleton rows={4} />}>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {venues.map((venue) => (
                <div key={venue.id} className="flex items-center gap-3 px-4 py-3 first:pt-4 last:pb-4">
                  <div className="h-9 w-9 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{venue.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit venue" onClick={() => openEdit(venue)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete venue"
                      onClick={() => setDeleteTarget(venue)}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </SkeletonReveal>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setURLParam('page', String(p))}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Venue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? Events using this venue will keep their recorded name but lose the managed link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteTarget?.id)} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
            <DialogDescription>Update the name for &quot;{editTarget?.name}&quot;.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-2 py-4">
              {editError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{editError}</div>
              )}
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ name: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={editing}>Cancel</Button>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={editing}>
                {editing ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
