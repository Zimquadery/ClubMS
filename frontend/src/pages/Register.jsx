import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'

function getPasswordStrength(password) {
  if (!password) return { label: '', color: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak', color: 'bg-destructive' }
  if (score <= 3) return { label: 'Fair', color: 'bg-status-yellow' }
  return { label: 'Strong', color: 'bg-status-green' }
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [studentId, setStudentId] = useState('')
  const [idCard, setIdCard] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (!idCard) {
      setError('ID card photo is required')
      setLoading(false)
      return
    }
    if (idCard.size > 5 * 1024 * 1024) {
      setError('ID card image must be under 5MB')
      setLoading(false)
      return
    }
    try {
      await register({ email, password, name, phone, studentId, idCardFile: idCard })
      navigate('/dashboard')
    } catch (err) {
      setError(
        err.response?.status === 429
          ? 'Too many attempts. Please wait a moment and try again.'
          : err.response?.data?.message || 'Registration failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      description="Create your account"
      error={error}
      submitLabel="Register"
      loading={loading}
      loadingLabel="Creating account..."
      onSubmit={handleSubmit}
      linkText="Already have an account?"
      linkTo="/login"
      linkLabel="Sign in"
      LinkComponent={Link}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+8801712345678"
          pattern="\+?[0-9]{6,15}"
          title="6-15 digits, optionally starting with +"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="studentId">Student ID</Label>
        <Input
          id="studentId"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="21190001"
          pattern="[0-9]{1,8}"
          maxLength={8}
          title="1-8 digits"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="idCard">Student ID Card Photo</Label>
        <label className="flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition">
          {idCard ? idCard.name : 'Choose an image (max 5MB)'}
          <input
            id="idCard"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setIdCard(e.target.files[0] || null)}
          />
        </label>
        <p className="text-xs text-muted-foreground">A photo of your student ID card is required to register</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {password && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full ${
                  getPasswordStrength(password).label === 'Weak' && level <= 1 ? getPasswordStrength(password).color :
                  getPasswordStrength(password).label === 'Fair' && level <= 2 ? getPasswordStrength(password).color :
                  getPasswordStrength(password).label === 'Strong' ? getPasswordStrength(password).color : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{getPasswordStrength(password).label}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
    </AuthLayout>
  )
}
