import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ClubDirectory from '@/pages/ClubDirectory'
import ClubDetail from '@/pages/ClubDetail'
import EventCalendar from '@/pages/EventCalendar'
import EventDetail from '@/pages/EventDetail'
import Profile from '@/pages/Profile'
import ManageClubs from '@/pages/admin/ManageClubs'
import PendingRequests from '@/pages/admin/PendingRequests'
import ClubMembers from '@/pages/admin/ClubMembers'
import NotFound from '@/pages/NotFound'

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
