import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/Pagination'
import { ListSkeleton } from '@/components/ui/skeleton'
import BackLink from '@/components/BackLink'
import { downloadBlob } from '@/lib/download'
import { toast } from 'sonner'
import { Download, Search, Users } from 'lucide-react'

const STATUS_TABS = [
  { label: 'All', value: null },
  { label: 'Going', value: 'GOING' },
  { label: 'Maybe', value: 'MAYBE' },
  { label: 'Not Going', value: 'NOT_GOING' },
]

const STATUS_BADGE_CLASS = {
  GOING: 'bg-status-green/15 text-status-green',
  MAYBE: 'bg-status-yellow/15 text-status-yellow',
  NOT_GOING: 'bg-destructive/15 text-destructive',
}

function relativeTime(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  if (diffMs < 60000) return 'just now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function EventRsvps() {
  const { id } = useParams()

  const [event, setEvent] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ GOING: 0, MAYBE: 0, NOT_GOING: 0 })

  useEffect(() => {
    fetchEvent()
  }, [id])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchRsvps()
  }, [id, statusFilter, page, debouncedSearch])

  async function fetchEvent() {
    try {
      const res = await client.get(`/events/${id}`)
      setEvent(res.data)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view this event.')
      } else {
        setError(err.response?.data?.message || 'Failed to load event')
      }
    }
  }

  async function fetchRsvps() {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20 }
      if (statusFilter) params.status = statusFilter
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      const res = await client.get(`/events/${id}/rsvps`, { params })
      setRsvps(res.data.items || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.totalPages || 1)
      setCounts(res.data.counts || { GOING: 0, MAYBE: 0, NOT_GOING: 0 })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load RSVPs')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    try {
      const res = await client.get(`/events/${id}/rsvps/export`, { responseType: 'blob' })
      downloadBlob(res.data, `rsvps-${id}.csv`)
      toast.success('RSVPs exported')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export RSVPs')
    }
  }

  if (error && !event) {
    return (
      <div className="space-y-4">
        <BackLink to="/events" label="Back to Events" />
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <BackLink to={`/events/${id}`} label="Back to Event" />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Header */}
      <div className="mt-4">
        <h1 className="text-2xl font-bold">
          {event?.title || 'Loading...'}
          <span className="text-sm text-muted-foreground font-normal">
            {' '}&middot; {event?.club?.name || ''}
          </span>
        </h1>
      </div>

      {/* Stats strip */}
      <div className="mt-3 flex flex-wrap items-center whitespace-nowrap text-sm text-muted-foreground">
        <span className="font-semibold text-status-green">{counts.GOING}</span> going
        <span className="mx-1.5 text-muted-foreground/40 select-none">&middot;</span>
        <span className="font-semibold text-status-yellow">{counts.MAYBE}</span> maybe
        <span className="mx-1.5 text-muted-foreground/40 select-none">&middot;</span>
        <span className="font-semibold text-destructive">{counts.NOT_GOING}</span> not going
        <span className="mx-1.5 text-muted-foreground/40 select-none">&middot;</span>
        <span className="font-semibold text-foreground">{total}</span> total
      </div>

      {/* Filter tabs + Search */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1" role="tablist">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.label}
              variant="ghost"
              size="sm"
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={statusFilter === tab.value ? 'bg-brand-primary/10 text-brand-primary' : ''}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email"
            aria-label="Search RSVPs by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-48"
          />
        </div>
      </div>

      {/* RSVP List */}
      <div className="mt-4">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : rsvps.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {statusFilter ? `No ${statusFilter.toLowerCase().replace('_', ' ')} RSVPs` : 'No RSVPs yet'}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent>
                <div className="divide-y">
                  {rsvps.map((rsvp) => (
                    <div
                      key={rsvp.id}
                      className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{rsvp.user?.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground truncate">{rsvp.user?.email}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={STATUS_BADGE_CLASS[rsvp.status]}>
                          {rsvp.status === 'NOT_GOING' ? 'Not Going' : rsvp.status.charAt(0) + rsvp.status.slice(1).toLowerCase()}
                        </Badge>
                        <span className="hidden sm:inline text-xs text-muted-foreground">
                          {rsvp.createdAt ? relativeTime(rsvp.createdAt) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
