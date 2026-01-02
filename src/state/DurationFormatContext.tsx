import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSetting, setSetting } from '../data/db'
import type { DurationFormat } from '../types'

interface DurationFormatContextValue {
  format: DurationFormat
  isLoading: boolean
  setFormatOption: (format: DurationFormat) => Promise<void>
  formatMinutes: (minutes: number) => string
}

const DEFAULT_FORMAT: DurationFormat = 'hm'

const DurationFormatContext = createContext<DurationFormatContextValue | undefined>(
  undefined,
)

const formatDuration = (minutes: number, format: DurationFormat) => {
  const safeMinutes = Math.max(0, Math.round(minutes))
  if (format === 'minutes') {
    return `${safeMinutes}min`
  }
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`
  }
  if (hours > 0) {
    return `${hours}h`
  }
  return `${mins}m`
}

export function DurationFormatProvider({ children }: { children: ReactNode }) {
  const [format, setFormat] = useState<DurationFormat>(DEFAULT_FORMAT)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await getSetting('durationFormat')
        if (!cancelled && (stored === 'hm' || stored === 'minutes')) {
          setFormat(stored)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setFormatOption = useCallback(async (nextFormat: DurationFormat) => {
    await setSetting('durationFormat', nextFormat)
    setFormat(nextFormat)
  }, [])

  const formatMinutes = useCallback(
    (minutes: number) => formatDuration(minutes, format),
    [format],
  )

  const value = useMemo(
    () => ({
      format,
      isLoading,
      setFormatOption,
      formatMinutes,
    }),
    [format, isLoading, setFormatOption, formatMinutes],
  )

  return (
    <DurationFormatContext.Provider value={value}>
      {children}
    </DurationFormatContext.Provider>
  )
}

export function useDurationFormat() {
  const ctx = useContext(DurationFormatContext)
  if (!ctx) {
    throw new Error('useDurationFormat must be used within DurationFormatProvider')
  }
  return ctx
}

export function formatMinutesStandalone(minutes: number, format: DurationFormat) {
  return formatDuration(minutes, format)
}
