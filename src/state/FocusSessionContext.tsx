import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  finishTask,
  getFocusingTask,
  getTask,
  updateTaskState,
} from '../data/db'
import type { Task, TaskState } from '../types'

interface FocusSessionSnapshot {
  taskId: string
  startedAt: string
  originState: TaskState
}

interface FocusSessionContextValue {
  focusingTask: Task | null
  session: FocusSessionSnapshot | null
  isBusy: boolean
  startFocus: (taskId: string) => Promise<void>
  finishFocus: (note?: string | null) => Promise<Task>
  exitWithoutRecording: () => Promise<void>
  refreshCurrentTask: () => Promise<void>
}

const FocusSessionContext = createContext<FocusSessionContextValue | undefined>(
  undefined,
)

const STORAGE_KEY = 'focus_session_state_v1'

const loadStoredSession = (): FocusSessionSnapshot | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FocusSessionSnapshot
    if (parsed.taskId && parsed.startedAt && parsed.originState) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

const persistSession = (session: FocusSessionSnapshot | null) => {
  if (typeof window === 'undefined') return
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY)
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }
}

export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<FocusSessionSnapshot | null>(() =>
    loadStoredSession(),
  )
  const [focusingTask, setFocusingTask] = useState<Task | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const syncTask = useCallback(
    async (snapshot: FocusSessionSnapshot | null) => {
      if (!snapshot) {
        setFocusingTask(null)
        persistSession(null)
        return
      }
      persistSession(snapshot)
      const task = await getTask(snapshot.taskId)
      if (!task) {
        setSession(null)
        setFocusingTask(null)
        return
      }
      setFocusingTask(task)
    },
    [],
  )

  useEffect(() => {
    syncTask(session)
  }, [session, syncTask])

  useEffect(() => {
    let cancelled = false
    if (session) return
    ;(async () => {
      const current = await getFocusingTask()
      if (!cancelled && current) {
        const fallback: FocusSessionSnapshot = {
          taskId: current.id,
          startedAt: new Date().toISOString(),
          originState: current.session_count > 0 ? 'warm' : 'cold',
        }
        setSession(fallback)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  const refreshCurrentTask = useCallback(async () => {
    if (!session) return
    const task = await getTask(session.taskId)
    if (!task) {
      setSession(null)
      setFocusingTask(null)
      return
    }
    setFocusingTask(task)
  }, [session])

  const startFocus = useCallback(
    async (taskId: string) => {
      setIsBusy(true)
      try {
        const existing = await getFocusingTask()
        if (existing && existing.id !== taskId) {
          throw new Error('已有其他任务正在深度中，请先 Finish。')
        }
        const baseTask =
          (existing && existing.id === taskId
            ? existing
            : await getTask(taskId)) ?? null
        if (!baseTask) {
          throw new Error('任务不存在或已删除')
        }
        if (baseTask.state === 'done') {
          throw new Error('已归档任务无法 Start')
        }
        const originState =
          baseTask.state === 'focusing'
            ? session?.originState ?? (baseTask.session_count > 0 ? 'warm' : 'cold')
            : baseTask.state
        if (baseTask.state !== 'focusing') {
          await updateTaskState(taskId, 'focusing')
        }
        const snapshot: FocusSessionSnapshot = {
          taskId,
          startedAt: new Date().toISOString(),
          originState,
        }
        setSession(snapshot)
        setFocusingTask({ ...baseTask, state: 'focusing' })
      } finally {
        setIsBusy(false)
      }
    },
    [session],
  )

  const clearSession = useCallback(() => {
    setSession(null)
    setFocusingTask(null)
    persistSession(null)
  }, [])

  const finishFocus = useCallback(
    async (note?: string | null) => {
      if (!session) {
        throw new Error('无进行中的会话')
      }
      setIsBusy(true)
      try {
        const startMs = new Date(session.startedAt).getTime()
        const nowMs = Date.now()
        const elapsedMinutes = Math.ceil(Math.max(nowMs - startMs, 60000) / 60000)
        const updatedTask = await finishTask({
          taskId: session.taskId,
          minutes: elapsedMinutes,
          note: note ?? null,
          startAt: session.startedAt,
        })
        clearSession()
        return updatedTask
      } finally {
        setIsBusy(false)
      }
    },
    [session, clearSession],
  )

  const exitWithoutRecording = useCallback(async () => {
    if (!session) {
      clearSession()
      return
    }
    setIsBusy(true)
    try {
      await updateTaskState(session.taskId, session.originState)
    } finally {
      clearSession()
      setIsBusy(false)
    }
  }, [session, clearSession])

  const value = useMemo(
    () => ({
      focusingTask,
      session,
      isBusy,
      startFocus,
      finishFocus,
      exitWithoutRecording,
      refreshCurrentTask,
    }),
    [
      focusingTask,
      session,
      isBusy,
      startFocus,
      finishFocus,
      exitWithoutRecording,
      refreshCurrentTask,
    ],
  )

  return (
    <FocusSessionContext.Provider value={value}>
      {children}
    </FocusSessionContext.Provider>
  )
}

export function useFocusSession() {
  const ctx = useContext(FocusSessionContext)
  if (!ctx) {
    throw new Error('useFocusSession must be used within FocusSessionProvider')
  }
  return ctx
}
