import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { PasswordStrength } from '@/components/ui/password-strength'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { ImagePlus, X } from 'lucide-react'

const MAX_ID_CARD_SIZE = 5 * 1024 * 1024

function formatSize(bytes) {
  if (bytes >= MAX_ID_CARD_SIZE) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [studentId, setStudentId] = useState('')
  const [idCard, setIdCard] = useState(null)
  const [idCardPreview, setIdCardPreview] = useState('')
  const [idCardError, setIdCardError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  usePageTitle(`Create account · ${import.meta.env.VITE_UNIVERSITY_NAME || 'ClubMS'}`)

  useEffect(() => () => {
    if (idCardPreview) URL.revokeObjectURL(idCardPreview)
  }, [idCardPreview])

  const selectIdCard = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setIdCardError('Please choose an image file')
      fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_ID_CARD_SIZE) {
      setIdCardError('ID card image must be under 5MB')
      fileInputRef.current.value = ''
      return
    }
    setIdCardError('')
    setIdCard(file)
    setIdCardPreview(URL.createObjectURL(file))
  }

  const removeIdCard = () => {
    setIdCard(null)
    setIdCardPreview('')
    setIdCardError('')
    fileInputRef.current.value = ''
  }

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
    if (idCard.size > MAX_ID_CARD_SIZE) {
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

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AuthLayout
      description="Create your account to join clubs and attend events"
      error={error}
      submitLabel="Register"
      loading={loading}
      loadingLabel="Creating account..."
      onSubmit={handleSubmit}
      linkText="Already have an account?"
      linkTo="/login"
      linkLabel="Sign in"
    >
      <section className="space-y-3" aria-label="Account">
        <p className="text-xs font-medium text-muted-foreground">Account</p>
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
      </section>
      <div className="border-t" />
      <section className="space-y-3" aria-label="Student verification">
        <p className="text-xs font-medium text-muted-foreground">Student verification</p>
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
          <input
            ref={fileInputRef}
            id="idCard"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => selectIdCard(e.target.files[0] || null)}
          />
          {idCard ? (
            <div className="flex items-center gap-3 rounded-lg border p-2">
              <img
                src={idCardPreview}
                alt="ID card preview"
                className="h-12 w-20 rounded-md border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{idCard.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(idCard.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={removeIdCard}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="idCard"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                selectIdCard(e.dataTransfer.files[0] || null)
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                dragOver
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-input hover:border-brand-primary/50 hover:bg-brand-primary/5'
              }`}
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Click or drag to upload</span>
              <span className="text-xs text-muted-foreground">JPG or PNG, up to 5MB</span>
            </label>
          )}
          {idCardError ? (
            <p className="text-xs text-destructive">{idCardError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">A photo of your student ID card is required to register</p>
          )}
        </div>
      </section>
      <div className="border-t" />
      <section className="space-y-3" aria-label="Security">
        <p className="text-xs font-medium text-muted-foreground">Security</p>
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
        <PasswordStrength password={password} />
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
      </section>
    </AuthLayout>
  )
}
