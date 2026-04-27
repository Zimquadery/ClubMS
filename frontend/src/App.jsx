import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const ClubDirectory = lazy(() => import('@/pages/ClubDirectory'))
const ClubDetail = lazy(() => import('@/pages/ClubDetail'))
const EventCalendar = lazy(() => import('@/pages/EventCalendar'))
const EventDetail = lazy(() => import('@/pages/EventDetail'))
const Profile = lazy(() => import('@/pages/Profile'))
const ManageClubs = lazy(() => import('@/pages/admin/ManageClubs'))
const PendingRequests = lazy(() => import('@/pages/admin/PendingRequests'))
const ClubMembers = lazy(() => import('@/pages/admin/ClubMembers'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const AuditLog = lazy(() => import('@/pages/admin/AuditLog'))

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" /></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="clubs" element={
              <ProtectedRoute><ClubDirectory /></ProtectedRoute>
            } />
            <Route path="clubs/:id" element={
              <ProtectedRoute><ClubDetail /></ProtectedRoute>
            } />
            <Route path="events" element={
              <ProtectedRoute><EventCalendar /></ProtectedRoute>
            } />
            <Route path="events/:id" element={
              <ProtectedRoute><EventDetail /></ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="admin/clubs" element={
              <ProtectedRoute roles={['PLATFORM_ADMIN']}><ManageClubs /></ProtectedRoute>
            } />
            <Route path="admin/clubs/:id/requests" element={
              <ProtectedRoute roles={['CLUB_ADMIN', 'PLATFORM_ADMIN']}><PendingRequests /></ProtectedRoute>
            } />
            <Route path="admin/clubs/:id/members" element={
              <ProtectedRoute roles={['CLUB_ADMIN', 'PLATFORM_ADMIN']}><ClubMembers /></ProtectedRoute>
            } />
            <Route path="admin/audit-logs" element={
              <ProtectedRoute roles={['PLATFORM_ADMIN']}><AuditLog /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
