import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import client from '@/api/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Users, ImageIcon } from 'lucide-react'
import { CLUB_CATEGORIES } from '@/lib/constants'
import { Pagination } from '@/components/Pagination'
import { CardSkeleton } from '@/components/ui/skeleton'

export default function ClubDirectory() {
  const [searchParams, setSearchParams] = useSearchParams()

  const setURLParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      if (next.toString() === prev.toString()) return prev
      return next
    })
  }

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const page = rawPage >= 1 ? rawPage : 1
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''

  const [searchInput, setSearchInput] = useState(search)
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalPages, setTotalPages] = useState(1)

  const prevSearchRef = useRef(search)

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const searchChanged = search !== prevSearchRef.current
    prevSearchRef.current = search
    let active = true

    const doFetch = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (category) params.set('category', category)
        params.set('page', page)
        const res = await client.get(`/clubs?${params.toString()}`)
        if (active) {
          setClubs(res.data.items)
          setTotalPages(res.data.totalPages)
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load clubs')
      } finally {
        if (active) setLoading(false)
      }
    }

    let timer
    if (searchChanged) {
      timer = setTimeout(doFetch, 300)
    } else {
      doFetch()
    }

    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [search, category, page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Club Directory</h1>
        <p className="text-sm text-muted-foreground">Browse and discover clubs at your university</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs by name..."
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value
              setSearchInput(val)
              setSearchParams(prev => {
                const next = new URLSearchParams(prev)
                if (val) next.set('search', val)
                else next.delete('search')
                const curPage = prev.get('page')
                if (curPage && curPage !== '1') next.set('page', '1')
                if (next.toString() === prev.toString()) return prev
                return next
              })
            }}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(val) => {
          const newCat = val === '__all__' ? '' : val
          setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            if (newCat) next.set('category', newCat)
            else next.delete('category')
            const curPage = prev.get('page')
            if (curPage && curPage !== '1') next.set('page', '1')
            if (next.toString() === prev.toString()) return prev
            return next
          })
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {CLUB_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && clubs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm">No clubs found. Try adjusting your search or filters.</p>
        </div>
      )}

      {!loading && !error && clubs.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link key={club.id} to={`/clubs/${club.id}`} className="group">
                <Card className="h-full flex flex-col transition-shadow hover:shadow-md">
                  <div className="h-24 rounded-t-xl bg-muted flex items-center justify-center overflow-hidden">
                    {club.logoUrl ? (
                      <img src={club.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate group-hover:text-brand-primary transition-colors">
                      {club.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col pt-0">
                    {club.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{club.description}</p>
                    )}
                    <div className="mt-auto flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">{club.category}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {club._count?.memberships ?? 0} member{(club._count?.memberships ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setURLParam('page', p)} />
        </>
      )}
    </div>
  )
}
