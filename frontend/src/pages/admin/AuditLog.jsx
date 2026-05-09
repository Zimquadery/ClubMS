import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { Pagination } from '@/components/Pagination'
import { ListSkeleton } from '@/components/ui/skeleton'

const ACTIONS = [
  'CLUB_CREATE', 'CLUB_UPDATE', 'CLUB_DELETE',
  'EVENT_CREATE', 'EVENT_UPDATE', 'EVENT_DELETE',
  'MEMBERSHIP_APPROVE', 'MEMBERSHIP_REJECT', 'MEMBERSHIP_SET_ALUMNI',
  'MEMBERSHIP_REMOVE', 'MEMBERSHIP_TRANSFER_ADMIN',
  'MEMBERSHIP_PROMOTE', 'MEMBERSHIP_DEMOTE',
  'MEMBERSHIP_BULK_APPROVE', 'MEMBERSHIP_BULK_REJECT',
  'ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_UPDATE', 'ANNOUNCEMENT_DELETE',
  'ANNOUNCEMENT_PIN', 'ANNOUNCEMENT_UNPIN',
]

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()

  const setURLParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      return next
    })
  }

  const [loading, setLoading] = useState(true)
  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const page = rawPage >= 1 ? rawPage : 1
  const [totalPages, setTotalPages] = useState(1)
  const action = searchParams.get('action') || ''
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    async function fetchData() {
      try {
        const params = new URLSearchParams()
        params.set('page', page)
        params.set('limit', 20)
        if (action) params.set('action', action)
        const res = await client.get(`/audit-logs?${params.toString()}`)
        if (active) {
          setLogs(res.data.items)
          setTotalPages(res.data.totalPages)
          setTotal(res.data.total)
        }
      } catch (err) {
        if (active) toast.error('Failed to load audit logs')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchData()
    return () => { active = false }
  }, [page, action])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track admin actions across the platform</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={action} onValueChange={(val) => { setURLParam('action', val === '__all__' ? '' : val); setURLParam('page', '1') }}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ListSkeleton rows={8} />
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No audit logs found
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">{total} log{total !== 1 ? 's' : ''} found</div>
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="bg-brand-primary/10 text-brand-primary border-transparent">
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        {log.targetType && (
                          <span className="text-xs text-muted-foreground">
                            {log.targetType}{log.targetId ? `: ${log.targetId.slice(0, 8)}...` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {log.actor && (
                          <span className="text-sm text-muted-foreground">
                            by {log.actor.name} ({log.actor.role.replace('_', ' ').toLowerCase()})
                          </span>
                        )}
                      </div>
                      {log.metadata && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {(() => { try { return JSON.stringify(JSON.parse(log.metadata)) } catch { return log.metadata } })()}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setURLParam('page', String(p))} />
        </>
      )}
    </div>
  )
}
