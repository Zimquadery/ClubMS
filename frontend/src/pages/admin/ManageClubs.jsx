import { useState, useEffect } from 'react'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Users, UserCheck, ClipboardList, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CLUB_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import { ListSkeleton } from '@/components/ui/skeleton'

function ClubFormFields({ form, setForm, uploading, onUpload, error, idPrefix }) {
  return (
    <div className="space-y-4 py-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}name`}>Name *</Label>
        <Input
          id={`${idPrefix}name`}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Coding Club"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}category`}>Category *</Label>
        <Select value={form.category} onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CLUB_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}description`}>Description</Label>
        <Input
          id={`${idPrefix}description`}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="A brief description of the club"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}logoUrl`}>Logo</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}logoUrl`}
            value={form.logoUrl}
            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            placeholder="https://example.com/logo.png"
            className="flex-1"
          />
          <label className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
            {uploading ? '...' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) onUpload(file, (url) => setForm((f) => ({ ...f, logoUrl: url })))
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default function ManageClubs() {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: '', logoUrl: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', category: '', logoUrl: '' })
  const [editError, setEditError] = useState('')
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchClubs()
  }, [])

  async function fetchClubs() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get('/clubs', { params: { limit: 100 } })
      const data = res.data.items ? res.data.items : res.data
      setClubs(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clubs')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    if (!form.name || !form.category) {
      setFormError('Name and category are required')
      return
    }
    setSubmitting(true)
    try {
      await client.post('/clubs', form)
      setDialogOpen(false)
      toast.success('Club created')
      setForm({ name: '', description: '', category: '', logoUrl: '' })
      await fetchClubs()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create club')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await client.delete(`/clubs/${id}`)
      setDeleteTarget(null)
      toast.success('Club deleted')
      await fetchClubs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete club')
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(club) {
    setEditTarget(club)
    setEditForm({ name: club.name, description: club.description || '', category: club.category, logoUrl: club.logoUrl || '' })
    setEditError('')
  }

  async function handleFileUpload(file, setFormValue) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFormValue(res.data.url)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditError('')
    if (!editForm.name || !editForm.category) {
      setEditError('Name and category are required')
      return
    }
    setEditing(true)
    try {
      await client.patch(`/clubs/${editTarget.id}`, editForm)
      setEditTarget(null)
      toast.success('Club updated')
      await fetchClubs()
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update club')
    } finally {
      setEditing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Clubs</h1>
          <p className="text-sm text-muted-foreground">Create and delete clubs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Club
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Club</DialogTitle>
              <DialogDescription>Fill in the details for the new club.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <ClubFormFields form={form} setForm={setForm} uploading={uploading} onUpload={handleFileUpload} error={formError} idPrefix="create-" />
              <DialogFooter>
                <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Club'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : clubs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No clubs yet. Create your first club using the button above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clubs.map((club) => (
            <Card key={club.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate">{club.name}</h3>
                    <Badge variant="secondary" className="text-xs">{club.category}</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {club._count?.memberships ?? 0} member{(club._count?.memberships ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/clubs/${club.id}/requests`}>
                    <Button variant="outline" size="sm">
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={`/admin/clubs/${club.id}/members`}>
                    <Button variant="outline" size="sm">
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => openEdit(club)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(club)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Club</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This will also remove all memberships and events. This action cannot be undone.
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
            <DialogTitle>Edit Club</DialogTitle>
            <DialogDescription>Update the details for &quot;{editTarget?.name}&quot;.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <ClubFormFields form={editForm} setForm={setEditForm} uploading={uploading} onUpload={handleFileUpload} error={editError} idPrefix="edit-" />
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
