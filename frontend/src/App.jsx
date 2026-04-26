import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ClubDirectory from '@/pages/ClubDirectory'
import ClubDetail from '@/pages/ClubDetail'
import ManageClubs from '@/pages/admin/ManageClubs'
import PendingRequests from '@/pages/admin/PendingRequests'
import ClubMembers from '@/pages/admin/ClubMembers'

function App() {
  return (
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
        <Route path="admin/clubs" element={
          <ProtectedRoute roles={['PLATFORM_ADMIN']}><ManageClubs /></ProtectedRoute>
        } />
        <Route path="admin/clubs/:id/requests" element={
          <ProtectedRoute roles={['CLUB_ADMIN', 'PLATFORM_ADMIN']}><PendingRequests /></ProtectedRoute>
        } />
        <Route path="admin/clubs/:id/members" element={
          <ProtectedRoute roles={['CLUB_ADMIN', 'PLATFORM_ADMIN']}><ClubMembers /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

export default App
