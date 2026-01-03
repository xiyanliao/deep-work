import { useCallback, useEffect, useState } from 'react'
import { getDB } from '../data/db'
import type { TaskCategory } from '../types'

export function useTotalMinutes(category?: TaskCategory) {
  const [minutes, setMinutes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const db = await getDB()
      const sessions = await db.getAll('sessions')
      const filtered = category
        ? sessions.filter((session) => session.category === category)
        : sessions
      const total = filtered.reduce((sum, session) => sum + session.minutes, 0)
      setMinutes(total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { minutes, isLoading, error, refresh }
}
