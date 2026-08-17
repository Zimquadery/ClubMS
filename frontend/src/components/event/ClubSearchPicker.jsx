import { useState, useEffect, useRef } from 'react';
import client from '@/api/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Search } from 'lucide-react';

export function ClubSearchPicker({ onSelect, excludeIds = [], placeholder = 'Search clubs by name...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await client.get('/clubs', { params: { search: q, limit: 8 } });
        if (!active) return;
        const excluded = new Set(excludeIds);
        setResults((res.data.items || []).filter((c) => !excluded.has(c.id)));
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, excludeKey]);

  function pick(club) {
    onSelect(club);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <Popover open={open && query.trim().length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1 max-h-[min(15rem,var(--radix-popover-content-available-height))] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => { if (anchorRef.current?.contains(e.target)) e.preventDefault(); }}
      >
        {loading ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
        ) : results.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No clubs found.</p>
        ) : (
          results.map((club) => (
            <button
              type="button"
              key={club.id}
              onClick={() => pick(club)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
            >
              <span className="font-medium truncate">{club.name}</span>
              <Badge variant="secondary" className="text-xs flex-shrink-0">{club.category}</Badge>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
