import { useCallback, useEffect, useState } from 'react'
import { listSessionsByRange } from '../data/db'
import { getTodayRange } from '../utils/time'

export function useTodayDeepMinutes() {
  const [minutes, setMinutes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { start, end } = getTodayRange()
      const sessions = await listSessionsByRange(start, end)
      const total = sessions.reduce((sum, session) => sum + session.minutes, 0)
      setMinutes(total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { minutes, isLoading, error, refresh }
}
