import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import client from '@/api/client'
import { Input } from '@/components/ui/input'
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
import { Search, Users, ImageIcon } from 'lucide-react'
import { CLUB_CATEGORIES } from '@/lib/constants'

export default function ClubDirectory() {
  const [clubs, setClubs] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchClubs()
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, category])

  async function fetchClubs() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      const res = await client.get(`/clubs?${params.toString()}`)
      setClubs(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clubs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Club Directory</h1>
        <p className="text-muted-foreground">Browse and discover clubs at your university</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(val) => setCategory(val === '__all__' ? '' : val)}>
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && clubs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No clubs found. Try adjusting your search or filters.
        </div>
      )}

      {!loading && !error && clubs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.id} to={`/clubs/${club.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 flex gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {club.logoUrl ? (
                      <img src={club.logoUrl} alt={club.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{club.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{club.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {club._count?.memberships ?? 0} member{(club._count?.memberships ?? 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
