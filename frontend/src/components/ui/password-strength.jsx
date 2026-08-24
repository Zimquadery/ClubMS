function getPasswordStrength(password) {
  if (!password) return { label: '', color: '', levels: 0 }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak', color: 'bg-destructive', levels: 1 }
  if (score <= 3) return { label: 'Fair', color: 'bg-status-yellow', levels: 2 }
  return { label: 'Strong', color: 'bg-status-green', levels: 3 }
}

export function PasswordStrength({ password }) {
  const strength = getPasswordStrength(password)
  if (!strength.label) return null
  return (
    <div className="space-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength.levels ? strength.color : 'bg-border'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strength.label}</p>
    </div>
  )
}
