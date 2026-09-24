export default function CountBadge({ count, label }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-yellow px-1.5 text-xs font-semibold leading-none tabular-nums text-status-yellow-foreground">
      {count}
      {label && <span className="sr-only"> {label}</span>}
    </span>
  )
}
