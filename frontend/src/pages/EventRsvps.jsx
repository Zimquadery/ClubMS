import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()

  const setURLParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      return next
    })
  }

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      next.set('page', '1')
      return next
    })
  }

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const page = rawPage >= 1 ? rawPage : 1
  const statusFilter = searchParams.get('statusFilter') || null

  const [event, setEvent] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ GOING: 0, MAYBE: 0, NOT_GOING: 0 })

  useEffect(() => {
    let active = true
    async function doFetch() {
      try {
        const res = await client.get(`/events/${id}`)
        if (active) setEvent(res.data)
      } catch (err) {
        if (active) {
          if (err.response?.status === 403) {
            setError('You do not have permission to view this event.')
          } else {
            setError(err.response?.data?.message || 'Failed to load event')
          }
        }
      }
    }
    doFetch()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    async function doFetch() {
      try {
        const params = { page, limit: 20 }
        if (statusFilter) params.status = statusFilter
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
        const res = await client.get(`/events/${id}/rsvps`, { params })
        if (active) {
          setRsvps(res.data.items || [])
          setTotal(res.data.total || 0)
          setTotalPages(res.data.totalPages || 1)
          setCounts(res.data.counts || { GOING: 0, MAYBE: 0, NOT_GOING: 0 })
        }
      } catch (err) {
        if (active) {
          if (err.response?.status === 403) {
            setError('You do not have permission to view RSVPs for this event.')
          } else {
            setError(err.response?.data?.message || 'Failed to load RSVPs')
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    doFetch()
    return () => { active = false }
  }, [id, statusFilter, page, debouncedSearch])

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
      <div className="flex items-center justify-between">
        <BackLink to={`/events/${id}`} label="Back to Event" />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-bold">
          {event?.title || 'Loading...'}
          <span className="text-sm text-muted-foreground font-normal">
            {' '}&middot; {event?.club?.name || ''}
          </span>
        </h1>
      </div>

      <div className="mt-2 ml-2">
        <div className="flex items-center flex-wrap">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            <strong className="font-semibold text-status-green">{counts.GOING}</strong>{' '}going
          </span>
          <span className="mx-1.5 text-muted-foreground/40 select-none" aria-hidden="true">·</span>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            <strong className="font-semibold text-status-yellow">{counts.MAYBE}</strong>{' '}maybe
          </span>
          <span className="mx-1.5 text-muted-foreground/40 select-none" aria-hidden="true">·</span>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            <strong className="font-semibold text-destructive">{counts.NOT_GOING}</strong>{' '}not going
          </span>
          <span className="mx-1.5 text-muted-foreground/40 select-none" aria-hidden="true">·</span>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">{total}</strong>{' '}total
          </span>
        </div>
      </div>

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
              onClick={() => updateFilter('statusFilter', tab.value)}
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
              <CardContent className="p-0">
                <div className="divide-y">
                  {rsvps.map((rsvp) => (
                    <div
                      key={rsvp.id}
                      className="flex items-center justify-between px-4 py-3 first:pt-4 last:pb-4"
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
            <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setURLParam('page', p)} />
          </>
        )}
      </div>
    </div>
  )
}
