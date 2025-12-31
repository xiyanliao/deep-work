import { useCallback, useEffect, useState } from 'react'
import { getSetting, setSetting } from '../data/db'

const PRESETS = [20, 40, 60, 120]
const DEFAULT_PREFERENCE = 40
const DEFAULT_CUSTOM = 50

export function useTimePreference() {
  const [timePreference, setTimePreference] = useState<number>(DEFAULT_PREFERENCE)
  const [customMinutes, setCustomMinutes] = useState<number>(DEFAULT_CUSTOM)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [preference, custom] = await Promise.all([
        getSetting('timePreferenceMinutes'),
        getSetting('lastCustomMinutes'),
      ])
      setTimePreference(
        typeof preference === 'number' ? preference : DEFAULT_PREFERENCE,
      )
      setCustomMinutes(typeof custom === 'number' ? custom : DEFAULT_CUSTOM)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const savePreference = useCallback(
    async (minutes: number, customValue?: number) => {
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 9999) {
        throw new Error('时间偏好需在 1-9999 分钟之间')
      }
      await setSetting('timePreferenceMinutes', minutes)
      setTimePreference(minutes)
      if (!PRESETS.includes(minutes) && typeof customValue === 'number') {
        await setSetting('lastCustomMinutes', customValue)
        setCustomMinutes(customValue)
      } else if (PRESETS.includes(minutes)) {
        // keep existing custom value for下次打开
      }
    },
    [],
  )

  return {
    timePreference,
    customMinutes,
    isLoading,
    error,
    refresh,
    savePreference,
  }
}
