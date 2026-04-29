import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '@/api/client'

export function useAdminClubSelector(navigatePathFn) {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const [adminClubs, setAdminClubs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAdminClubs() {
      try {
        const res = await client.get('/memberships/my-admin-clubs')
        setAdminClubs(res.data)
      } catch {
        setError('Failed to load admin clubs')
      }
    }
    fetchAdminClubs()
  }, [])

  const currentClub = adminClubs.find((c) => c.id === clubId)

  function navigateToClub(val) {
    navigate(navigatePathFn(val))
  }

  return { clubId, adminClubs, currentClub, adminError: error, navigateToClub }
}
