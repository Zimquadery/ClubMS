import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { User, Lock } from 'lucide-react'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import { getInitials } from '@/lib/initials'
import { BANGLADESH_DISTRICTS } from '@/lib/constants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

const roleLabels = {
  PLATFORM_ADMIN: 'Platform Admin',
  CLUB_ADMIN: 'Club Admin',
  FACULTY: 'Faculty',
  STUDENT: 'Student',
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [studentId, setStudentId] = useState(user?.studentId || '')
  const [department, setDepartment] = useState(user?.department || '')
  const [homeDistrict, setHomeDistrict] = useState(user?.homeDistrict || '')
  const [idCardUrl, setIdCardUrl] = useState(user?.idCardUrl || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  async function handleProfileUpdate(e) {
    e.preventDefault()
    setProfileLoading(true)
    try {
      await client.patch('/auth/profile', { name, email, phone, studentId, department: department.trim() || null, homeDistrict: homeDistrict || null, idCardUrl })
      await refreshUser()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    try {
      await client.patch('/auth/password', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-brand-primary text-white text-lg font-semibold">
            {getInitials(user?.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Badge variant="secondary" className="text-xs">
              {roleLabels[user?.role] || user?.role}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-brand-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. CSE, EEE, ECE, Agri"
                  maxLength={100}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Optional — shown next to your name on member lists</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeDistrict">Home District</Label>
                <Select value={homeDistrict || 'none'} onValueChange={(v) => setHomeDistrict(v === 'none' ? '' : v)}>
                  <SelectTrigger id="homeDistrict">
                    <SelectValue placeholder="Select your district" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {homeDistrict && !BANGLADESH_DISTRICTS.includes(homeDistrict) && (
                      <SelectItem value={homeDistrict}>{homeDistrict}</SelectItem>
                    )}
                    {BANGLADESH_DISTRICTS.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Optional — shown alongside your department on member lists</p>
              </div>
              <div className="space-y-2">
                <Label>Student ID Card</Label>
                <div className="flex items-center gap-2">
                  {idCardUrl && (
                    <a
                      href={idCardUrl}
                      target="_blank"
                      rel="noopener"
                      className="text-sm text-brand-primary underline-offset-4 hover:underline"
                    >
                      View ID card
                    </a>
                  )}
                  <ImageUploadButton label="Upload new ID card" onUploadComplete={setIdCardUrl} />
                </div>
                {idCardUrl !== (user?.idCardUrl || '') && (
                  <p className="text-xs text-status-yellow">New card uploaded — click Save Changes to apply</p>
                )}
                <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, or WebP — max 5MB</p>
              </div>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={profileLoading}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-brand-primary" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <PasswordInput id="currentPassword" autoComplete="current-password" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput id="newPassword" autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          getPasswordStrength(newPassword).label === 'Weak' && level <= 1 ? getPasswordStrength(newPassword).color :
                          getPasswordStrength(newPassword).label === 'Fair' && level <= 2 ? getPasswordStrength(newPassword).color :
                          getPasswordStrength(newPassword).label === 'Strong' ? getPasswordStrength(newPassword).color : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{getPasswordStrength(newPassword).label}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <PasswordInput id="confirmPassword" autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
