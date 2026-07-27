import { useState, useEffect } from 'react'
import client from '@/api/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CUSTOM = '__custom__'

export function VenuePicker({ venueId, venue, onChange, label = 'Venue', idPrefix = 'venue' }) {
  const [venues, setVenues] = useState([])

  useEffect(() => {
    let active = true
    async function doFetch() {
      try {
        const res = await client.get('/venues', { params: { limit: 100 } })
        const data = res.data.items ? res.data.items : res.data
        if (active) setVenues(data)
      } catch {
      }
    }
    doFetch()
    return () => { active = false }
  }, [])

  const selectValue = venueId || (venue ? CUSTOM : '')

  function handleSelectChange(val) {
    if (val === CUSTOM) {
      onChange({ venueId: '', venue: '' })
    } else {
      const found = venues.find((v) => v.id === val)
      onChange({ venueId: val, venue: found ? found.name : '' })
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-select`}>{label}</Label>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={`${idPrefix}-select`}>
          <SelectValue placeholder="Select a venue" />
        </SelectTrigger>
        <SelectContent>
          {venues.map((v) => (
            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
          ))}
          <SelectItem value={CUSTOM}>Custom…</SelectItem>
        </SelectContent>
      </Select>
      {selectValue === CUSTOM && (
        <Input
          id={`${idPrefix}-custom`}
          placeholder="Enter custom location"
          value={venue}
          onChange={(e) => onChange({ venueId: '', venue: e.target.value })}
        />
      )}
    </div>
  )
}
