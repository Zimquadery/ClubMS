import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function usePaginatedFetch({ fetchFn, deps = [], enabled = true }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const setURLParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      return next
    })
  }

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const page = rawPage >= 1 ? rawPage : 1

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    fetchFn({ page })
      .then((result) => {
        if (!active) return
        const fetchedItems = result.items || []
        if (fetchedItems.length === 0 && page > 1) {
          setURLParam('page', String(page - 1))
          return
        }
        setItems(fetchedItems)
        setTotalPages(result.totalPages || 1)
        if (result.total !== undefined) setTotal(result.total)
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [enabled, page, ...deps])

  async function refetch() {
    setLoading(true)
    setError('')
    try {
      const result = await fetchFn({ page })
      const fetchedItems = result.items || []
      if (fetchedItems.length === 0 && page > 1) {
        setURLParam('page', String(page - 1))
        return
      }
      setItems(fetchedItems)
      setTotalPages(result.totalPages || 1)
      if (result.total !== undefined) setTotal(result.total)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  return {
    items, setItems, loading, error, page, totalPages, total,
    refetch, setURLParam, searchParams, setSearchParams,
  }
}
