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
import { Plus, Trash2, Users, UserCheck, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CLUB_CATEGORIES } from '@/lib/constants'

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

  useEffect(() => {
    fetchClubs()
  }, [])

  async function fetchClubs() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get('/clubs')
      setClubs(res.data)
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
      await fetchClubs()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete club')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Clubs</h1>
          <p className="text-muted-foreground">Create and delete clubs</p>
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
              <div className="space-y-4 py-4">
                {formError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Coding Club"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
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
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="A brief description of the club"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={form.logoUrl}
                    onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
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
                    <h3 className="font-semibold truncate">{club.name}</h3>
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
    </div>
  )
}
