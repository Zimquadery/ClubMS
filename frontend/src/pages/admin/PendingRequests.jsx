import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, X, Users, ArrowLeft } from 'lucide-react'

export default function PendingRequests() {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const [adminClubs, setAdminClubs] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchAdminClubs()
  }, [])

  useEffect(() => {
    if (clubId) fetchRequests()
  }, [clubId])

  async function fetchAdminClubs() {
    try {
      const res = await client.get('/memberships/my-admin-clubs')
      setAdminClubs(res.data)
    } catch {
      setError('Failed to load admin clubs')
    }
  }

  async function fetchRequests() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get(`/clubs/${clubId}/members`, { params: { status: 'PENDING' } })
      setRequests(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(userId, action) {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await client.patch(`/clubs/${clubId}/members/${userId}/${action}`)
      setRequests((prev) => prev.filter((r) => r.userId !== userId))
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} request`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const currentClub = adminClubs.find((c) => c.id === clubId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pending Requests</h1>
          <p className="text-muted-foreground">Review membership requests</p>
        </div>
        {adminClubs.length > 1 && (
          <Select value={clubId} onValueChange={(val) => navigate(`/admin/clubs/${val}/requests`)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adminClubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {currentClub && (
        <Badge variant="secondary">{currentClub.name}</Badge>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No pending requests
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{req.user.name}</p>
                  <p className="text-sm text-muted-foreground">{req.user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested {formatDate(req.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                    disabled={actionLoading[req.userId]}
                    onClick={() => handleAction(req.userId, 'approve')}
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={actionLoading[req.userId]}
                    onClick={() => handleAction(req.userId, 'reject')}
                  >
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
