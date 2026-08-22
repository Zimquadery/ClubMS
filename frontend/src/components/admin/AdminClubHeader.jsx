import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AdminClubHeader({ title, subtitle, adminClubs, currentClub, clubId, onClubChange, actions = null }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {(adminClubs.length > 1 || actions) && (
          <div className="flex items-center gap-2">
            {adminClubs.length > 1 && (
              <Select value={clubId} onValueChange={onClubChange}>
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
            {actions}
          </div>
        )}
      </div>
      {currentClub && (
        <Badge variant="secondary">{currentClub.name}</Badge>
      )}
    </>
  )
}
