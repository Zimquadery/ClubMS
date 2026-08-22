import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

const MAX = 10

export function TagInput({
  value,
  onChange,
  idPrefix = 'tags',
  label = 'Tags',
  disabled = false,
  normalize = (s) => s.trim().toLowerCase(),
  hint,
  placeholder = 'Type a tag and press Enter',
  maxLength = 30,
}) {
  const [draft, setDraft] = useState('')
  const atMax = value.length >= MAX

  function commit(raw) {
    const tag = normalize(raw)
    if (!tag || tag.includes(',') || value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...value, tag])
    setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (draft.trim()) commit(draft)
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function remove(tag) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-input`}>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint ?? `Optional. Add up to ${MAX} keywords to help people find this event.`}</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => remove(tag)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border bg-brand-primary/10 text-brand-primary border-brand-primary/30 transition hover:bg-brand-primary/20 active:scale-[0.96]"
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      {!atMax && (
        <Input
          id={`${idPrefix}-input`}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={maxLength}
        />
      )}
    </div>
  )
}
